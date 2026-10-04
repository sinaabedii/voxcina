package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
)

func TestRecommendProductSizeRejectsMalformedRequestsBeforeDatabase(t *testing.T) {
	tests := []struct {
		name, id, body string
	}{
		{name: "invalid object id", id: "not-an-object-id", body: `{}`},
		{name: "invalid json", id: "507f1f77bcf86cd799439011", body: `{"fit_preference":`},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/products/"+test.id+"/size-recommendation", strings.NewReader(test.body))
			req = mux.SetURLVars(req, map[string]string{"id": test.id})
			recorder := httptest.NewRecorder()
			RecommendProductSize(recorder, req)
			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400; body=%s", recorder.Code, recorder.Body.String())
			}
		})
	}
}
