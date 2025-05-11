package test

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"testing"
	"time"
)

var api *TestAPI

func TestMain(m *testing.M) {
	// Wait for the API server to be ready
	api = NewTestAPI()
	if err := waitForAPI(60); err != nil {
		log.Fatalf("API server not ready: %v", err)
	}

	// Setup test user
	testEmail := "test@example.com"
	testPassword := "test123"
	testName := "Test User"
	
	if err := api.SetupTestUser(testEmail, testPassword, testName); err != nil {
		log.Fatalf("Failed to setup test user: %v", err)
	}
	
	log.Println("Running API tests...")
	exitCode := m.Run()
	
	// Cleanup after tests
	api.CleanupAfterTests()
	
	os.Exit(exitCode)
}

// waitForAPI waits for the API server to be ready
func waitForAPI(maxWaitSeconds int) error {
	log.Printf("Waiting for API server at %s to be ready...", api.BaseURL)
	
	for i := 0; i < maxWaitSeconds; i++ {
		resp, _, err := api.Request(http.MethodGet, "/health", nil, "")
		if err == nil && resp.StatusCode == http.StatusOK {
			log.Println("API server is ready!")
			return nil
		}
		
		log.Printf("API server not ready yet, waiting %d/%d seconds...", i+1, maxWaitSeconds)
		time.Sleep(1 * time.Second)
	}
	
	return fmt.Errorf("API server not ready after %d seconds", maxWaitSeconds)
} 