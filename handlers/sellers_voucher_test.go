package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func TestSellerVoucherRemovalDecide(t *testing.T) {
	now := time.Date(2026, 9, 28, 12, 0, 0, 0, time.UTC)
	sellerID := primitive.NewObjectID()
	otherID := primitive.NewObjectID()

	sellerVoucher := func(owner primitive.ObjectID, validTo time.Time) *models.Discount {
		return &models.Discount{SellerID: &owner, ValidTo: validTo}
	}

	tests := []struct {
		name               string
		discount           *models.Discount
		sellerID           primitive.ObjectID
		wantOwned          bool
		wantAlreadyExpired bool
	}{
		{
			name:      "owned active voucher needs expiring",
			discount:  sellerVoucher(sellerID, now.Add(time.Hour)),
			sellerID:  sellerID,
			wantOwned: true,
		},
		{
			// Idempotent path: the handler must answer 200 without writing.
			name:               "owned already-expired voucher is a no-op",
			discount:           sellerVoucher(sellerID, now.Add(-time.Hour)),
			sellerID:           sellerID,
			wantOwned:          true,
			wantAlreadyExpired: true,
		},
		{
			// Boundary: valid_to == now is already unusable
			// (GetDiscountByCode rejects now.After(ValidTo) only on strictly
			// future codes, and equality is not strictly future).
			name:               "valid_to exactly now counts as expired",
			discount:           sellerVoucher(sellerID, now),
			sellerID:           sellerID,
			wantOwned:          true,
			wantAlreadyExpired: true,
		},
		{
			name:     "another seller's voucher is hidden",
			discount: sellerVoucher(otherID, now.Add(time.Hour)),
			sellerID: sellerID,
		},
		{
			// An admin/platform discount has no seller_id; a seller must not
			// be able to expire it.
			name:     "non-seller discount is hidden",
			discount: &models.Discount{ValidTo: now.Add(time.Hour)},
			sellerID: sellerID,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			owned, alreadyExpired := sellerVoucherRemovalDecide(tt.discount, tt.sellerID, now)
			if owned != tt.wantOwned || alreadyExpired != tt.wantAlreadyExpired {
				t.Fatalf("got owned=%v alreadyExpired=%v, want owned=%v alreadyExpired=%v",
					owned, alreadyExpired, tt.wantOwned, tt.wantAlreadyExpired)
			}
		})
	}
}

func TestDeleteSellerVoucherRejectsBadID(t *testing.T) {
	sellerID := primitive.NewObjectID()
	req := httptest.NewRequest(http.MethodDelete, "/api/seller/vouchers/not-an-objectid", nil)
	req = req.WithContext(context.WithValue(req.Context(), "userID", sellerID))
	req = mux.SetURLVars(req, map[string]string{"id": "not-an-objectid"})
	rec := httptest.NewRecorder()

	DeleteSellerVoucher(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestDeleteSellerVoucherRequiresAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/api/seller/vouchers/"+primitive.NewObjectID().Hex(), nil)
	req = mux.SetURLVars(req, map[string]string{"id": primitive.NewObjectID().Hex()})
	rec := httptest.NewRecorder()

	DeleteSellerVoucher(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestValidateSellerVoucherParams(t *testing.T) {

	now := time.Date(2026, 9, 27, 12, 0, 0, 0, time.UTC)

	intPtr := func(v int) *int { return &v }
	timePtr := func(t time.Time) *time.Time { return &t }

	tests := []struct {
		name          string
		discPercent   *int
		sharePercent  *int
		maxUses       *int
		validDays     *int
		validTo       *time.Time
		wantErrorMsg  string
		wantValidDiff time.Duration
	}{
		{
			name:         "missing discount percent",
			discPercent:  nil,
			sharePercent: intPtr(18),
			maxUses:      intPtr(50),
			validDays:    intPtr(30),
			wantErrorMsg: "درصد تخفیف مشتری و سهم فروشنده هر دو باید مشخص شوند",
		},
		{
			name:         "missing max uses",
			discPercent:  intPtr(18),
			sharePercent: intPtr(18),
			maxUses:      nil,
			validDays:    intPtr(30),
			wantErrorMsg: "سقف تعداد استفاده برای کاربران باید عددی بزرگتر از صفر باشد",
		},
		{
			name:         "zero max uses",
			discPercent:  intPtr(18),
			sharePercent: intPtr(18),
			maxUses:      intPtr(0),
			validDays:    intPtr(30),
			wantErrorMsg: "سقف تعداد استفاده برای کاربران باید عددی بزرگتر از صفر باشد",
		},
		{
			name:         "negative max uses",
			discPercent:  intPtr(18),
			sharePercent: intPtr(18),
			maxUses:      intPtr(-5),
			validDays:    intPtr(30),
			wantErrorMsg: "سقف تعداد استفاده برای کاربران باید عددی بزرگتر از صفر باشد",
		},
		{
			name:         "invalid budget sum",
			discPercent:  intPtr(20),
			sharePercent: intPtr(20),
			maxUses:      intPtr(50),
			validDays:    intPtr(30),
			wantErrorMsg: "مجموع تخفیف مشتری و سهم فروشنده باید دقیقاً ۳۶ درصد باشد",
		},
		{
			name:         "zero valid days",
			discPercent:  intPtr(18),
			sharePercent: intPtr(18),
			maxUses:      intPtr(50),
			validDays:    intPtr(0),
			wantErrorMsg: "مدت اعتبار باید بین ۱ تا ۳۶۵ روز (حداکثر ۱ سال) باشد",
		},
		{
			name:         "valid days exceeding 365",
			discPercent:  intPtr(18),
			sharePercent: intPtr(18),
			maxUses:      intPtr(50),
			validDays:    intPtr(366),
			wantErrorMsg: "مدت اعتبار باید بین ۱ تا ۳۶۵ روز (حداکثر ۱ سال) باشد",
		},
		{
			name:         "validTo in past",
			discPercent:  intPtr(18),
			sharePercent: intPtr(18),
			maxUses:      intPtr(50),
			validTo:      timePtr(now.Add(-1 * time.Hour)),
			wantErrorMsg: "تاریخ انقضا باید در آینده باشد",
		},
		{
			name:         "validTo over 1 year",
			discPercent:  intPtr(18),
			sharePercent: intPtr(18),
			maxUses:      intPtr(50),
			validTo:      timePtr(now.Add(370 * 24 * time.Hour)),
			wantErrorMsg: "تاریخ انقضا نمی‌تواند بیشتر از ۱ سال باشد",
		},
		{
			name:         "missing duration and date",
			discPercent:  intPtr(18),
			sharePercent: intPtr(18),
			maxUses:      intPtr(50),
			wantErrorMsg: "مدت اعتبار یا تاریخ انقضا الزامی است (حداکثر ۱ سال)",
		},
		{
			name:          "valid with days",
			discPercent:   intPtr(18),
			sharePercent:  intPtr(18),
			maxUses:       intPtr(100),
			validDays:     intPtr(30),
			wantValidDiff: 30 * 24 * time.Hour,
		},
		{
			name:          "valid with max 365 days",
			discPercent:   intPtr(0),
			sharePercent:  intPtr(36),
			maxUses:       intPtr(10),
			validDays:     intPtr(365),
			wantValidDiff: 365 * 24 * time.Hour,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			validTo, err := validateSellerVoucherParams(tt.discPercent, tt.sharePercent, tt.maxUses, tt.validDays, tt.validTo, now)
			if tt.wantErrorMsg != "" {
				if err != tt.wantErrorMsg {
					t.Fatalf("expected error %q, got %q", tt.wantErrorMsg, err)
				}
				return
			}
			if err != "" {
				t.Fatalf("unexpected error %q", err)
			}
			if diff := validTo.Sub(now); diff != tt.wantValidDiff {
				t.Fatalf("expected diff %v, got %v", tt.wantValidDiff, diff)
			}
		})
	}
}
