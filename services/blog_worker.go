package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
)

// BlogWorker manages the async pipeline processing of blog posts.
type BlogWorker struct {
	repo         *BlogRepository
	braveClient  *BraveSearchClient
	structClient *OpenRouterStructuredClient
	researchAgent *ResearchAgent
	writingAgent  *WritingAgent
	concurrency  int
	maxRetries   int
	running      bool
	stopCh       chan struct{}
	wg           sync.WaitGroup
}

// NewBlogWorker creates a new BlogWorker.
func NewBlogWorker(repo *BlogRepository, braveClient *BraveSearchClient, structClient *OpenRouterStructuredClient, researchAgent *ResearchAgent, writingAgent *WritingAgent, concurrency, maxRetries int) *BlogWorker {
	if concurrency <= 0 {
		concurrency = 3
	}
	if maxRetries <= 0 {
		maxRetries = 3
	}
	return &BlogWorker{
		repo:          repo,
		braveClient:   braveClient,
		structClient:  structClient,
		researchAgent: researchAgent,
		writingAgent:  writingAgent,
		concurrency:   concurrency,
		maxRetries:    maxRetries,
		stopCh:        make(chan struct{}),
	}
}

// Start begins the worker loop.
func (w *BlogWorker) Start() {
	if w.running {
		return
	}
	w.running = true

	// Expire stale leases on startup
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	expired, err := w.repo.ExpireStaleLeases(ctx, 30*time.Minute)
	if err != nil {
		log.Printf("[blog-worker] failed to expire stale leases: %v", err)
	} else if expired > 0 {
		log.Printf("[blog-worker] expired %d stale leases", expired)
	}

	// Start concurrency goroutines
	for i := 0; i < w.concurrency; i++ {
		w.wg.Add(1)
		go w.workerLoop(i)
	}

	// Start periodic stale lease cleanup every 5 minutes
	w.wg.Add(1)
	go w.staleLeaseCleanupLoop()

	log.Printf("[blog-worker] started with %d workers", w.concurrency)
}

// Stop gracefully shuts down the worker.
func (w *BlogWorker) Stop() {
	if !w.running {
		return
	}
	close(w.stopCh)
	w.wg.Wait()
	w.running = false
	log.Println("[blog-worker] stopped")
}

// staleLeaseCleanupLoop periodically expires stale leases to prevent stuck executions.
func (w *BlogWorker) staleLeaseCleanupLoop() {
	defer w.wg.Done()
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-w.stopCh:
			return
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			expired, err := w.repo.ExpireStaleLeases(ctx, 10*time.Minute)
			cancel()
			if err != nil {
				log.Printf("[blog-worker] periodic stale lease cleanup failed: %v", err)
			} else if expired > 0 {
				log.Printf("[blog-worker] periodic cleanup: expired %d stale leases", expired)
			}
		}
	}
}

func (w *BlogWorker) workerLoop(id int) {
	defer w.wg.Done()
	for {
		select {
		case <-w.stopCh:
			return
		default:
			func() {
				defer func() {
					if r := recover(); r != nil {
						log.Printf("[blog-worker] worker %d recovered from panic: %v", id, r)
						time.Sleep(5 * time.Second)
					}
				}()
				w.processNext(id)
			}()
		}
	}
}

// processNext finds and processes the next pending execution for any stage.
func (w *BlogWorker) processNext(workerID int) {
	// The write stage can make two sequential OpenRouter calls (main attempt +
	// one repair retry), each retried up to 3x internally at requestTimeout
	// (5m) per attempt — a worst case of ~30m. Budget with margin so a slow
	// but eventually-successful "low" reasoning call isn't killed mid-flight.
	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Minute)
	defer cancel()

	// Try stages in order: research -> write -> prompts
	stages := []string{models.StageResearch, models.StageWrite, models.StagePrompts}
	for _, stage := range stages {
		exec, err := w.findAndLease(ctx, stage, fmt.Sprintf("%d", workerID))
		if err != nil {
			if err == mongo.ErrNoDocuments {
				continue
			}
			log.Printf("[blog-worker] error finding execution: %v", err)
			time.Sleep(2 * time.Second)
			return
		}
		w.runStage(ctx, exec, stage)
		return
	}
	time.Sleep(2 * time.Second) // No work found, back off
}

// findAndLease finds a pending execution for a stage and leases it.
func (w *BlogWorker) findAndLease(ctx context.Context, stage, workerID string) (*models.BlogAgentExecution, error) {
	exec, err := w.repo.FindPendingExecution(ctx, stage)
	if err != nil {
		return nil, err
	}
	leased, err := w.repo.LeaseExecution(ctx, exec.ID, workerID)
	if err != nil {
		return nil, err
	}
	return leased, nil
}

// runStage executes the appropriate stage logic.
func (w *BlogWorker) runStage(ctx context.Context, exec *models.BlogAgentExecution, stage string) {
	start := time.Now()
	var output, errMsg, rawResp, promptKey, promptVersion, provider, model string
	var tokenUsage int
	var costMeta string

	switch stage {
	case models.StageResearch:
		output, rawResp, errMsg, promptKey, promptVersion, provider, model, tokenUsage, costMeta = w.runResearch(ctx, exec)
	case models.StageWrite:
		output, rawResp, errMsg, promptKey, promptVersion, provider, model, tokenUsage, costMeta = w.runWrite(ctx, exec)
	case models.StagePrompts:
		output, rawResp, errMsg, promptKey, promptVersion, provider, model, tokenUsage, costMeta = w.runPrompts(ctx, exec)
	default:
		errMsg = fmt.Sprintf("unknown stage: %s", stage)
	}

	duration := time.Since(start).Milliseconds()
	status := "completed"
	if errMsg != "" {
		status = "failed"
	}

	if err := w.repo.CompleteExecution(ctx, exec.ID, status, errMsg, duration, output, rawResp, promptKey, promptVersion, provider, model, tokenUsage, costMeta); err != nil {
		log.Printf("[blog-worker] failed to complete execution %s: %v", exec.ID.Hex(), err)
	}

	// If failed and retries remain, requeue
	if status == "failed" && exec.RetryCount < w.maxRetries {
		if err := w.repo.IncrementRetryCount(ctx, exec.ID); err != nil {
			log.Printf("[blog-worker] failed to requeue execution %s: %v", exec.ID.Hex(), err)
		} else {
			log.Printf("[blog-worker] requeued execution %s (attempt %d)", exec.ID.Hex(), exec.RetryCount+1)
		}
	} else if status == "failed" {
		log.Printf("[blog-worker] execution %s failed permanently: %s", exec.ID.Hex(), errMsg)
	}

	// Only advance pipeline status on success
	if status == "completed" {
		w.updatePipelineStatus(ctx, exec.PipelineRunID, stage)
	} else if status == "failed" && exec.RetryCount >= w.maxRetries {
		// On permanent failure, reset pipeline to a recoverable state so the admin can retry.
		w.recoverPipelineOnFailure(ctx, exec.PipelineRunID, stage)
	}
}

// recoverPipelineOnFailure resets the pipeline run status when an agent permanently fails,
// so the admin can see the error and re-trigger the stage.
func (w *BlogWorker) recoverPipelineOnFailure(ctx context.Context, runID primitive.ObjectID, stage string) {
	run, err := w.repo.FindPipelineRunByID(ctx, runID)
	if err != nil {
		log.Printf("[blog-worker] failed to load run for failure recovery: %v", err)
		return
	}

	var newStatus string
	switch stage {
	case models.StageResearch:
		newStatus = models.PipelineBrief // can re-trigger research
	case models.StageWrite:
		newStatus = models.PipelineResearchApproved // can re-trigger writing
	case models.StagePrompts:
		newStatus = models.PipelineContentApproved // can re-trigger prompts
	default:
		return
	}

	if newStatus != "" && run.Status != newStatus {
		log.Printf("[blog-worker] resetting run %s from %s to %s due to permanent %s failure", runID.Hex(), run.Status, newStatus, stage)
		w.repo.UpdatePipelineRunStatus(ctx, runID, bson.M{
			"status":     newStatus,
			"updated_at": time.Now(),
		})
	}
}

// runResearch performs the research stage using the ResearchAgent.
func (w *BlogWorker) runResearch(ctx context.Context, exec *models.BlogAgentExecution) (string, string, string, string, string, string, string, int, string) {
	run, err := w.repo.FindPipelineRunByID(ctx, exec.PipelineRunID)
	if err != nil {
		return "", "", fmt.Sprintf("failed to load pipeline run: %v", err), "", "", "", "", 0, ""
	}

	model := run.Model
	if model == "" {
		model = "qwen/qwen3.7-plus"
	}

	brief := &models.GenerationBrief{
		Topic:          run.Topic,
		Locale:         run.Locale,
		TargetAudience: run.TargetAudience,
		DesiredLength:  run.DesiredLength,
		Tone:           run.Tone,
		Keywords:       run.Keywords,
		Category:       run.Category,
	}

	snapshot, err := w.researchAgent.RunResearch(ctx, run, brief)
	if err != nil {
		return "", "", fmt.Sprintf("research failed: %v", err), "", "", "openrouter", model, 0, ""
	}

	outputJSON, _ := json.Marshal(snapshot)
	return string(outputJSON), string(outputJSON), "", "blog.research", "1", "openrouter", model, len(snapshot.Sources), ""
}

// runWrite performs the writing stage.
func (w *BlogWorker) runWrite(ctx context.Context, exec *models.BlogAgentExecution) (string, string, string, string, string, string, string, int, string) {
	run, err := w.repo.FindPipelineRunByID(ctx, exec.PipelineRunID)
	if err != nil {
		return "", "", fmt.Sprintf("failed to load pipeline run: %v", err), "", "", "", "", 0, ""
	}

	model := run.Model
	if model == "" {
		model = "qwen/qwen3.7-plus"
	}

	brief := &models.GenerationBrief{
		Topic:          run.Topic,
		Locale:         run.Locale,
		TargetAudience: run.TargetAudience,
		DesiredLength:  run.DesiredLength,
		Tone:           run.Tone,
		Keywords:       run.Keywords,
		Category:       run.Category,
	}

	// Get research execution to extract findings
	researchExec, err := w.repo.FindCompletedExecution(ctx, run.ID, models.StageResearch)
	if err != nil {
		return "", "", fmt.Sprintf("failed to find research execution: %v", err), "", "", "", "", 0, ""
	}

	// Parse research output - handle both snapshot format and direct ResearchOutput format
	var researchOutput ResearchOutput
	if researchExec.ParsedOutput != nil {
		// Convert bson.D/bson.M to regular map for proper JSON marshaling
		converted := convertBSONToMap(researchExec.ParsedOutput)
		outputJSON, err := json.Marshal(converted)
		if err != nil {
			log.Printf("[blog-worker] Warning: failed to marshal research output: %v", err)
		} else {
			jsonStr := string(outputJSON)
			if len(jsonStr) > 1000 {
				jsonStr = jsonStr[:1000]
			}
			log.Printf("[blog-worker] Converted research output JSON (first 1000 chars): %s", jsonStr)
			
			// Try snapshot format first (has "output" field)
			var snapshotWrapper struct {
				Output ResearchOutput `json:"output"`
			}
			if err := json.Unmarshal(outputJSON, &snapshotWrapper); err != nil {
				log.Printf("[blog-worker] Warning: snapshot wrapper parse failed: %v", err)
			} else if len(snapshotWrapper.Output.Findings) > 0 {
				researchOutput = snapshotWrapper.Output
				log.Printf("[blog-worker] Successfully parsed research snapshot with %d findings", len(researchOutput.Findings))
			} else {
				// Fall back to direct ResearchOutput format
				if err := json.Unmarshal(outputJSON, &researchOutput); err != nil {
					log.Printf("[blog-worker] Warning: direct research output parse failed: %v", err)
				} else {
					log.Printf("[blog-worker] Successfully parsed direct research output with %d findings", len(researchOutput.Findings))
				}
			}
		}
	}

	// Get research sources
	sources, _ := w.repo.FindSourcesByRunID(ctx, run.ID)

	snapshot := &ResearchSnapshot{
		Output:          researchOutput,
		Sources:         sources,
		GeneratedAt:     time.Now(),
		GenerationBrief: *brief,
	}

	// Use WritingAgent to generate structured content
	post, err := w.writingAgent.RunWriting(ctx, run, snapshot)
	if err != nil {
		return "", "", fmt.Sprintf("writing agent failed: %v", err), "", "", "openrouter", model, 0, ""
	}

	// Serialize the writing result for storage
	writingResult := map[string]interface{}{
		"blocks":              post.Blocks,
		"excerpt":             post.Excerpt,
		"recommended_category": post.Category,
		"recommended_tags":    post.Tags,
	}
	outputJSON, _ := json.Marshal(writingResult)

	return string(outputJSON), string(outputJSON), "", "blog.write", "1", "openrouter", model, 0, ""
}

// runPrompts performs the prompts generation stage using the PromptAgent.
func (w *BlogWorker) runPrompts(ctx context.Context, exec *models.BlogAgentExecution) (string, string, string, string, string, string, string, int, string) {
	run, err := w.repo.FindPipelineRunByID(ctx, exec.PipelineRunID)
	if err != nil {
		return "", "", fmt.Sprintf("failed to load pipeline run: %v", err), "", "", "", "", 0, ""
	}

	model := run.Model
	if model == "" {
		model = "qwen/qwen3.7-plus"
	}

	// Find the blog post linked to this pipeline run — by run.PostID (the
	// authoritative link), not by an unscoped pipeline_run_id lookup, since a
	// retried write stage can leave more than one blog_posts document
	// pointing at the same run and an unscoped query can return a stale one.
	if run.PostID == "" {
		return "", "", "no post linked to this pipeline run yet", "", "", "", "", 0, ""
	}
	postID, err := primitive.ObjectIDFromHex(run.PostID)
	if err != nil {
		return "", "", fmt.Sprintf("invalid linked post ID: %v", err), "", "", "", "", 0, ""
	}
	post, err := w.repo.FindPostByID(ctx, postID)
	if err != nil {
		return "", "", fmt.Sprintf("failed to find blog post for pipeline run: %v", err), "", "", "", "", 0, ""
	}

	promptAgent := NewPromptAgent(w.structClient, w.repo)
	output, err := promptAgent.RunPromptGeneration(ctx, run, post)
	if err != nil {
		return "", "", fmt.Sprintf("prompt generation failed: %v", err), "", "", "openrouter", model, 0, ""
	}

	outputJSON, _ := json.Marshal(output)
	return string(outputJSON), string(outputJSON), "", "blog.prompts", "1", "openrouter", model, 0, ""
}

// convertBSONToMap recursively converts bson.D/bson.M/bson.A structures to regular maps for JSON marshaling.
func convertBSONToMap(v interface{}) interface{} {
	switch val := v.(type) {
	case bson.D:
		m := make(map[string]interface{})
		for _, e := range val {
			m[e.Key] = convertBSONToMap(e.Value)
		}
		return m
	case bson.M:
		m := make(map[string]interface{})
		for k, v := range val {
			m[k] = convertBSONToMap(v)
		}
		return m
	case bson.A:
		arr := make([]interface{}, len(val))
		for i, v := range val {
			arr[i] = convertBSONToMap(v)
		}
		return arr
	case []interface{}:
		arr := make([]interface{}, len(val))
		for i, v := range val {
			arr[i] = convertBSONToMap(v)
		}
		return arr
	default:
		return v
	}
}

// updatePipelineStatus updates the pipeline run status based on completed stage.
func (w *BlogWorker) updatePipelineStatus(ctx context.Context, runID primitive.ObjectID, completedStage string) {
	run, err := w.repo.FindPipelineRunByID(ctx, runID)
	if err != nil {
		return
	}

	var newStatus string
	switch completedStage {
	case models.StageResearch:
		newStatus = models.PipelineResearchApproved
	case models.StageWrite:
		newStatus = models.PipelineContentApproved
	case models.StagePrompts:
		newStatus = models.PipelinePromptsApproved
	}

	if newStatus != "" && run.Status != newStatus {
		w.repo.UpdatePipelineRunStatus(ctx, runID, bson.M{
			"status":     newStatus,
			"updated_at": time.Now(),
		})
	}
}
