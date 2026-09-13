package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"backEnd/services"
)

// respondBindError maps the bind sentinel errors to stable HTTP shapes; the
// mergeable flag decides whether the bot may retry with "merge": true.

func TestRespondBindErrorPhoneTakenMergeable(t *testing.T) {
	w := httptest.NewRecorder()
	respondBindError(w, errPhoneTaken, true)

	if w.Code != http.StatusConflict {
		t.Fatalf("phone_taken must be 409, got %d", w.Code)
	}
	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("body must be JSON: %v", err)
	}
	if body["code"] != ExternalErrCodePhoneTaken {
		t.Fatalf("code must be phone_taken, got %v", body["code"])
	}
	if body["can_merge"] != true {
		t.Fatalf("the SMS-OTP path must advertise can_merge:true, got %v", body["can_merge"])
	}
}

func TestRespondBindErrorPhoneTakenNotMergeable(t *testing.T) {
	w := httptest.NewRecorder()
	respondBindError(w, errPhoneTaken, false)

	if w.Code != http.StatusConflict {
		t.Fatalf("phone_taken must be 409, got %d", w.Code)
	}
	var body map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["can_merge"] != false {
		t.Fatalf("the contact path must advertise can_merge:false, got %v", body["can_merge"])
	}
	if body["merge_via"] != "sms_otp" {
		t.Fatalf("the contact path must point the bot at the OTP flow, got %v", body["merge_via"])
	}
}

func TestRespondBindErrorPhoneAlreadySet(t *testing.T) {
	w := httptest.NewRecorder()
	respondBindError(w, errPhoneAlreadySet, false)

	if w.Code != http.StatusConflict {
		t.Fatalf("phone_already_set must be 409, got %d", w.Code)
	}
	var body map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["code"] != ExternalErrCodePhoneAlreadySet {
		t.Fatalf("code must be phone_already_set, got %v", body["code"])
	}
	if _, ok := body["can_merge"]; ok {
		t.Fatalf("phone_already_set must not advertise a merge")
	}
}

func TestRespondBindErrorOwnerConflict(t *testing.T) {
	w := httptest.NewRecorder()
	respondBindError(w, errPhoneOwnerConflict, true)

	if w.Code != http.StatusConflict {
		t.Fatalf("phone_owner_conflict must be 409, got %d", w.Code)
	}
	var body map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["code"] != ExternalErrCodePhoneOwnerConflict {
		t.Fatalf("code must be phone_owner_conflict, got %v", body["code"])
	}
}

func TestRespondBindErrorMergeIncomplete(t *testing.T) {
	w := httptest.NewRecorder()
	respondBindError(w, fmt.Errorf("merge on phone bind: %w", services.ErrMergeIncomplete), false)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("merge incomplete must be 503, got %d", w.Code)
	}
	var body map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["code"] != "MERGE_INCOMPLETE" {
		t.Fatalf("code must be MERGE_INCOMPLETE, got %v", body["code"])
	}
}
