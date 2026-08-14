package services

import (
	"fmt"
	"strings"
	"testing"
)

// The band the agent is handed each turn is what decides whether a customer who
// earned an increase actually gets one, so pin down the arithmetic: the floor
// never regresses, the step is a real move above it, and neither escapes the cap.
func TestResolveNegotiationStateLadder(t *testing.T) {
	cfg := SellerConfig()

	tests := map[string]struct {
		grantCount   int
		prevMax      int
		wantFloor    int
		wantNextStep int
		wantCeiling  int
	}{
		"first turn starts at the base": {
			grantCount:   0,
			prevMax:      0,
			wantFloor:    cfg.BaseDiscountPercent,
			wantNextStep: cfg.BaseDiscountPercent * 2,
			wantCeiling:  cfg.MaxDiscountPercent,
		},
		"floor holds what was already granted": {
			grantCount:   2,
			prevMax:      15,
			wantFloor:    15,
			wantNextStep: 15 + cfg.BaseDiscountPercent,
			wantCeiling:  cfg.MaxDiscountPercent,
		},
		"step is capped at the ceiling": {
			grantCount:   3,
			prevMax:      cfg.MaxDiscountPercent,
			wantFloor:    cfg.MaxDiscountPercent,
			wantNextStep: cfg.MaxDiscountPercent,
			wantCeiling:  cfg.MaxDiscountPercent,
		},
		"a grant above a lowered cap is not clawed back": {
			grantCount:   1,
			prevMax:      cfg.MaxDiscountPercent + 10,
			wantFloor:    cfg.MaxDiscountPercent + 10,
			wantNextStep: cfg.MaxDiscountPercent + 10,
			wantCeiling:  cfg.MaxDiscountPercent + 10,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			state := ResolveNegotiationState(tc.grantCount, tc.prevMax, "")
			if state.Floor != tc.wantFloor {
				t.Errorf("Floor = %d, want %d", state.Floor, tc.wantFloor)
			}
			if state.NextStep != tc.wantNextStep {
				t.Errorf("NextStep = %d, want %d", state.NextStep, tc.wantNextStep)
			}
			if state.Ceiling != tc.wantCeiling {
				t.Errorf("Ceiling = %d, want %d", state.Ceiling, tc.wantCeiling)
			}
			if state.NextStep < state.Floor || state.NextStep > state.Ceiling {
				t.Errorf("NextStep %d outside band [%d, %d]", state.NextStep, state.Floor, state.Ceiling)
			}
		})
	}
}

// The step the prompt names must be one the gate will actually let through —
// otherwise the agent is told to grant a number that is silently reduced.
func TestNextStepPassesReasonGateWithNewReason(t *testing.T) {
	state := ResolveNegotiationState(1, 15, "customer is buying several items")

	got, granted := enforceReasonGate(state, state.NextStep, "customer named a wedding they are attending")
	if !granted {
		t.Fatalf("gate refused the prompted next step %d%% for a new reason", state.NextStep)
	}
	if got != state.NextStep {
		t.Errorf("granted %d%%, want the prompted next step %d%%", got, state.NextStep)
	}

	held, granted := enforceReasonGate(state, state.NextStep, "customer is purchasing multiple pieces")
	if granted {
		t.Error("gate allowed an increase for a reworded version of the reason on file")
	}
	if held != state.Floor {
		t.Errorf("held at %d%%, want the floor %d%%", held, state.Floor)
	}
}

// The state block is the only place the model learns the numbers, so it has to
// carry the step it is expected to move to.
func TestFormatNegotiationStateNamesTheNextStep(t *testing.T) {
	state := ResolveNegotiationState(1, 15, "customer is buying several items")
	block := formatNegotiationState(state)

	for _, want := range []string{
		fmt.Sprintf("Next step up: %d%%", state.NextStep),
		fmt.Sprintf("grant %d%%", state.NextStep),
		fmt.Sprintf("Absolute maximum: %d%%", state.Ceiling),
	} {
		if !strings.Contains(block, want) {
			t.Errorf("negotiation state block missing %q:\n%s", want, block)
		}
	}
}
