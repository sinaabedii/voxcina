package handlers

import (
	"testing"
	"time"
)

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
