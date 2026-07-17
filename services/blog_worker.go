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
	concurrency  int
	maxRetries   int
	running      bool
	stopCh       chan struct{}
	wg           sync.WaitGroup
}

// NewBlogWorker creates a new BlogWorker.
func NewBlogWorker(repo *BlogRepository, braveClient *BraveSearchClient, structClient *OpenRouterStructuredClient, researchAgent *ResearchAgent, concurrency, maxRetries int) *BlogWorker {
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

func (w *BlogWorker) workerLoop(id int) {
	defer w.wg.Done()
	for {
		select {
		case <-w.stopCh:
			return
		default:
			w.processNext(id)
		}
	}
}

// processNext finds and processes the next pending execution for any stage.
func (w *BlogWorker) processNext(workerID int) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
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
	}
}

// runResearch performs the research stage using the ResearchAgent.
func (w *BlogWorker) runResearch(ctx context.Context, exec *models.BlogAgentExecution) (string, string, string, string, string, string, string, int, string) {
	run, err := w.repo.FindPipelineRunByID(ctx, exec.PipelineRunID)
	if err != nil {
		return "", "", fmt.Sprintf("failed to load pipeline run: %v", err), "", "", "", "", 0, ""
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
		return "", "", fmt.Sprintf("research failed: %v", err), "", "", "openrouter", "qwen/qwen3.7-plus", 0, ""
	}

	outputJSON, _ := json.Marshal(snapshot)
	return string(outputJSON), string(outputJSON), "", "blog.research", "1", "openrouter", "qwen/qwen3.7-plus", len(snapshot.Sources), ""
}

// runWrite performs the writing stage.
func (w *BlogWorker) runWrite(ctx context.Context, exec *models.BlogAgentExecution) (string, string, string, string, string, string, string, int, string) {
	run, err := w.repo.FindPipelineRunByID(ctx, exec.PipelineRunID)
	if err != nil {
		return "", "", fmt.Sprintf("failed to load pipeline run: %v", err), "", "", "", "", 0, ""
	}

	// Build writing prompt
	systemPrompt := fmt.Sprintf(`You are a professional Persian-language blogger writing for an Iranian e-commerce site called Voxcina. Write a %d-word blog post about "%s" in a %s tone for %s audience. Include keywords: %v. Category: %s.`,
		run.DesiredLength, run.Topic, run.Tone, run.TargetAudience, run.Keywords, run.Category)

	messages := []OpenRouterMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: "Write the blog post now in Persian."},
	}

	req := StructuredRequest{
		Model:    "qwen/qwen3.7-plus",
		Messages: messages,
		MaxTokens: 4096,
	}

	resp, err := w.structClient.CallStructured(ctx, req)
	if err != nil {
		return "", "", fmt.Sprintf("LLM write failed: %v", err), "", "", "openrouter", req.Model, 0, ""
	}

	return resp.Content, resp.Content, "", "blog.write", "1", "openrouter", req.Model, resp.Usage.TotalTokens, ""
}

// runPrompts performs the prompts generation stage (for image generation prompts).
func (w *BlogWorker) runPrompts(ctx context.Context, exec *models.BlogAgentExecution) (string, string, string, string, string, string, string, int, string) {
	run, err := w.repo.FindPipelineRunByID(ctx, exec.PipelineRunID)
	if err != nil {
		return "", "", fmt.Sprintf("failed to load pipeline run: %v", err), "", "", "", "", 0, ""
	}

	systemPrompt := fmt.Sprintf(`Generate image generation prompts for a blog post about "%s". Create %d prompts (one for cover, rest for in-content images). Return as JSON array.`, run.Topic, 3)

	messages := []OpenRouterMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: "Generate the prompts."},
	}

	req := StructuredRequest{
		Model:    "qwen/qwen3.7-plus",
		Messages: messages,
		Schema: map[string]interface{}{
			"name": "image_prompts",
			"schema": map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"slot":   map[string]interface{}{"type": "string"},
						"prompt": map[string]interface{}{"type": "string"},
					},
				},
			},
		},
	}

	resp, err := w.structClient.CallStructured(ctx, req)
	if err != nil {
		return "", "", fmt.Sprintf("LLM prompts failed: %v", err), "", "", "openrouter", req.Model, 0, ""
	}

	return resp.Content, resp.Content, "", "blog.prompts", "1", "openrouter", req.Model, resp.Usage.TotalTokens, ""
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
