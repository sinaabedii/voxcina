package handlers

import (
	"testing"
	"time"
)

// The generation goroutine fills a task's fields one at a time and the status
// endpoints read it from another goroutine. Publication has to be all-or-
// nothing: a reader that caught "done" before the image path beside it was
// written reported a finished try-on with no image, and the fitting room had
// nothing to show for a generation that had in fact succeeded.
func TestPublishTryOnTaskSnapshotsState(t *testing.T) {
	const taskID = "task-snapshot-test"
	task := &tryOnTask{ID: taskID, Status: "processing", CreatedAt: time.Now()}
	publishTryOnTask(taskID, task)
	t.Cleanup(func() { tryOnTasks.Delete(taskID) })

	// Half-written: status flipped, image not yet assigned.
	task.Status = "done"

	got, ok := loadTryOnTask(taskID)
	if !ok {
		t.Fatal("loadTryOnTask lost the task")
	}
	if got.Status != "processing" {
		t.Errorf("status = %q before publication, want the last published %q", got.Status, "processing")
	}

	task.Image = "/uploads/products/tryon/1.jpg"
	publishTryOnTask(taskID, task)

	got, ok = loadTryOnTask(taskID)
	if !ok {
		t.Fatal("loadTryOnTask lost the task after publication")
	}
	if got.Status != "done" || got.Image != "/uploads/products/tryon/1.jpg" {
		t.Errorf("published snapshot = %+v, want status done with its image", got)
	}
}
