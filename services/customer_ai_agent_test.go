package services

import (
	"context"
	"encoding/json"
	"testing"

	"backEnd/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// agentDecisionSchema is the contract the model's output is validated against; it
// must constrain the action to a closed set and require a reply so a free-text
// response can never make it through CallStructured.
func TestAgentDecisionSchemaConstrainsActionAndReply(t *testing.T) {
	schema := agentDecisionSchema()
	props, _ := schema["properties"].(map[string]interface{})

	action, ok := props["action"].(map[string]interface{})
	if !ok {
		t.Fatal("schema missing action property")
	}
	enumRaw, ok := action["enum"].([]string)
	if !ok {
		t.Fatalf("action enum missing, got %T", action["enum"])
	}
	want := map[string]bool{"respond": true, "search": true, "not_found": true}
	if len(enumRaw) != len(want) {
		t.Fatalf("action enum = %v, want exactly %v", enumRaw, want)
	}
	for _, v := range enumRaw {
		if !want[v] {
			t.Fatalf("unexpected action %q", v)
		}
	}

	required, _ := schema["required"].([]string)
	if len(required) == 0 {
		t.Fatal("schema must require reply")
	}
	foundReply := false
	for _, r := range required {
		if r == "reply" {
			foundReply = true
		}
	}
	if !foundReply {
		t.Fatalf("reply not required; required=%v", required)
	}
}

// sanitizeCustomerReply must strip a leaking JSON blob, a narrated tool call and
// a fenced code block, while keeping genuine Persian text intact.
func TestSanitizeCustomerReplyStripsInternalLeaks(t *testing.T) {
	tests := map[string]struct {
		in   string
		want string
	}{
		"plain Persian reply survives": {
			in:   "این یک جواب معمولی است.",
			want: "این یک جواب معمولی است.",
		},
		"JSON blob is dropped": {
			in:   `{"action":"respond","product_ids":["123"]} لطفا ببینید`,
			want: "لطفا ببینید",
		},
		"narrated tool call is dropped": {
			in:   "I will call offer_coupon now. این محصول خوب است.",
			want: "این محصول خوب است.",
		},
		"fenced code block is dropped": {
			in:   "```json\n{\"a\":1}\n``` این جواب است.",
			want: "این جواب است.",
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if got := sanitizeCustomerReply(tc.in); got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

// isUsableCustomerReply must reject machinery-only strings so they can never
// reach the user as a "response".
func TestIsUsableCustomerReply(t *testing.T) {
	if !isUsableCustomerReply("این یک جواب است") {
		t.Error("Persian text should be usable")
	}
	if isUsableCustomerReply("") {
		t.Error("empty reply should not be usable")
	}
	if isUsableCustomerReply("12345") {
		t.Error("digits-only reply should not be usable")
	}
	if isUsableCustomerReply("```json") {
		t.Error("machinery reply should not be usable")
	}
}

// catalogContext must serialize the authoritative DB rows as id/name/price and,
// critically, never expose any more than that.
func TestCatalogContextExposesOnlyIdNamePrice(t *testing.T) {
	id := primitive.NewObjectID()
	svc := &CustomerAIService{}
	products := []models.Product{{
		ID:    id,
		Name:  "Shirt",
		Price: 150000,
	}}

	out := svc.catalogContext(products)

	var envelope struct {
		Results []map[string]interface{} `json:"results"`
	}
	if err := json.Unmarshal([]byte(out), &envelope); err != nil {
		t.Fatalf("catalogContext is not valid JSON: %v", err)
	}
	if len(envelope.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(envelope.Results))
	}
	row := envelope.Results[0]
	if row["id"] != id.Hex() {
		t.Errorf("id = %v, want %s", row["id"], id.Hex())
	}
	// The response must not leak document internals beyond what the model may
	// speak about.
	for k := range row {
		if k != "id" && k != "name" && k != "price" && k != "name_fa" && k != "material_fa" {
			t.Errorf("catalogContext leaked unexpected field %q", k)
		}
	}
}

// finalize must never surface products the model did not shed: with an empty
// authoritative set it returns Success=false and a safe Persian fallback rather
// than echoing arbitrary prose.
func TestFinalizeEmptyProducesSafeFallback(t *testing.T) {
	svc := &CustomerAIService{config: &CustomerAIConfig{}}

	// No products, model returned empty reply -> safe generic fallback.
	resp, err := svc.finalize(context.Background(), CustomerSearchRequest{}, nil, nil, "")
	if err != nil {
		t.Fatalf("finalize returned error: %v", err)
	}
	if resp.Success {
		t.Error("empty result should be success=false")
	}
	if !isUsableCustomerReply(resp.Response) {
		t.Errorf("fallback reply is not usable Persian: %q", resp.Response)
	}
	if len(resp.Products) != 0 {
		t.Errorf("expected no products, got %d", len(resp.Products))
	}

	// No products, model returned a usable Persian line -> keep it (it is grounded
	// by the model but schema-constrained and sanitized), still success=false.
	resp2, err := svc.finalize(context.Background(), CustomerSearchRequest{}, nil, nil, "چیزی برای این جستجو پیدا نشد.")
	if err != nil {
		t.Fatalf("finalize returned error: %v", err)
	}
	if resp2.Success {
		t.Error("empty result should be success=false even with a reply")
	}
	if resp2.Response != "چیزی برای این جستجو پیدا نشد." {
		t.Errorf("grounded empty reply not preserved: %q", resp2.Response)
	}
}

// finalize must not emit product ids that do not match the authoritative set it
// was handed: the ids returned to the caller are recomputed from the products,
// never from model-provided strings.
func TestFinalizeProductIDsDeriveFromAuthoritativeRows(t *testing.T) {
	svc := &CustomerAIService{config: &CustomerAIConfig{}}
	id := primitive.NewObjectID()
	products := []models.Product{{ID: id, Name: "Shirt", Price: 100}}
	resp, err := svc.finalize(context.Background(), CustomerSearchRequest{}, products, nil, "این چندتا رو ببین.")
	if err != nil {
		t.Fatalf("finalize returned error: %v", err)
	}
	if !resp.Success {
		t.Error("present products should be success=true")
	}
	if len(resp.ProductIDs) != 1 || resp.ProductIDs[0] != id.Hex() {
		t.Errorf("ProductIDs = %v, want [%s]", resp.ProductIDs, id.Hex())
	}
}
