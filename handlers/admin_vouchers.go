package handlers

import (
	"context"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// adminVoucherItem is the unified shape every voucher/coupon source (admin
// discount codes — public or user-targeted — and auto-issued negotiated_coupons
// — try-on "negotiated" or SMS "cart_recovery") is normalized into for the
// admin vouchers list.
type adminVoucherItem struct {
	ID                string           `json:"id"`
	Code              string           `json:"code"`
	Type              string           `json:"type"` // "public" | "targeted" | "negotiated" | "cart_recovery"
	DiscountType      string           `json:"discount_type"`
	Value             float64          `json:"value"`
	Status            string           `json:"status"` // "active" | "scheduled" | "expired" | "used" | "depleted"
	ValidFrom         string           `json:"valid_from,omitempty"`
	ValidUntil        string           `json:"valid_until"`
	CreatedAt         string           `json:"created_at"`
	UserID            string           `json:"user_id,omitempty"`
	UserName          string           `json:"user_name,omitempty"`
	UserPhone         string           `json:"user_phone,omitempty"`
	AssignedUserCount int              `json:"assigned_user_count,omitempty"`
	UsedCount         int              `json:"used_count,omitempty"`
	MaxUses           int              `json:"max_uses,omitempty"`
	MinOrderAmount    float64          `json:"min_order_amount,omitempty"`
	RequiredProducts  []voucherProduct `json:"required_products,omitempty"`
}

type adminVoucherStats struct {
	Total     int `json:"total"`
	Active    int `json:"active"`
	Scheduled int `json:"scheduled"`
	Expired   int `json:"expired"`
	Used      int `json:"used"`
	Depleted  int `json:"depleted"`
}

// GetAdminVouchers lists every voucher/coupon in the system — admin discount
// codes (public and targeted) plus auto-issued negotiated_coupons (try-on
// negotiated and cart-recovery) — normalized into one filterable, paginated
// table.
// GET /api/admin/vouchers
func GetAdminVouchers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	typeFilter := q.Get("type")     // "", "public", "targeted", "negotiated", "cart_recovery"
	statusFilter := q.Get("status") // "", "active", "scheduled", "expired", "used", "depleted"
	search := strings.TrimSpace(q.Get("search"))
	sortBy := q.Get("sort_by") // "newest" (default) | "oldest"

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 {
		limit = 20
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	usersColl := db.Database.Collection("users")

	// If searching, first resolve which users match by name/phone so
	// user-scoped/targeted vouchers can be matched even when the code itself
	// doesn't contain the search text.
	var searchUserIDs map[primitive.ObjectID]bool
	if search != "" {
		cursor, err := usersColl.Find(ctx, bson.M{
			"$or": []bson.M{
				{"name": bson.M{"$regex": search, "$options": "i"}},
				{"phone": bson.M{"$regex": search}},
			},
		})
		if err == nil {
			var users []models.User
			if err := cursor.All(ctx, &users); err == nil {
				searchUserIDs = make(map[primitive.ObjectID]bool, len(users))
				for _, u := range users {
					searchUserIDs[u.ID] = true
				}
			}
		}
	}

	now := time.Now()
	items := make([]adminVoucherItem, 0)

	includePublic := typeFilter == "" || typeFilter == "public"
	includeTargeted := typeFilter == "" || typeFilter == "targeted"
	includeNegotiated := typeFilter == "" || typeFilter == "negotiated"
	includeCartRecovery := typeFilter == "" || typeFilter == "cart_recovery"

	if includePublic || includeTargeted {
		discountsColl := db.Database.Collection("discounts")
		cursor, err := discountsColl.Find(ctx, bson.M{})
		if err == nil {
			var discounts []models.Discount
			if err := cursor.All(ctx, &discounts); err == nil {
				for _, d := range discounts {
					voucherType := "targeted"
					if d.IsPublic {
						voucherType = "public"
					}
					if voucherType == "public" && !includePublic {
						continue
					}
					if voucherType == "targeted" && !includeTargeted {
						continue
					}

					if search != "" {
						codeMatches := strings.Contains(strings.ToLower(d.Code), strings.ToLower(search))
						userMatches := false
						if searchUserIDs != nil {
							for _, uid := range d.AssignedUsers {
								if searchUserIDs[uid] {
									userMatches = true
									break
								}
							}
						}
						if !codeMatches && !userMatches {
							continue
						}
					}

					status := "active"
					if now.After(d.ValidTo) {
						status = "expired"
					} else if d.MaxUses > 0 && d.UsedCount >= d.MaxUses {
						status = "depleted"
					} else if now.Before(d.ValidFrom) {
						status = "scheduled"
					}

					item := adminVoucherItem{
						ID:                d.ID.Hex(),
						Code:              d.Code,
						Type:              voucherType,
						DiscountType:      d.Type,
						Value:             d.Value,
						Status:            status,
						ValidFrom:         d.ValidFrom.Format(time.RFC3339),
						ValidUntil:        d.ValidTo.Format(time.RFC3339),
						CreatedAt:         d.CreatedAt.Format(time.RFC3339),
						UsedCount:         d.UsedCount,
						MaxUses:           d.MaxUses,
						MinOrderAmount:    d.MinOrderAmount,
						AssignedUserCount: len(d.AssignedUsers),
					}
					for _, pid := range d.ApplicableTo.ProductIDs {
						if vp, ok := resolveVoucherProduct(ctx, pid, "", ""); ok {
							item.RequiredProducts = append(item.RequiredProducts, vp)
						}
					}
					items = append(items, item)
				}
			}
		}
	}

	if includeNegotiated || includeCartRecovery {
		couponsColl := db.Database.Collection("negotiated_coupons")
		cursor, err := couponsColl.Find(ctx, bson.M{})
		if err == nil {
			var coupons []models.NegotiatedCoupon
			if err := cursor.All(ctx, &coupons); err == nil {
				userIDSet := make(map[primitive.ObjectID]bool, len(coupons))
				for _, c := range coupons {
					userIDSet[c.UserID] = true
				}
				userIDs := make([]primitive.ObjectID, 0, len(userIDSet))
				for id := range userIDSet {
					userIDs = append(userIDs, id)
				}
				userMap := make(map[primitive.ObjectID]models.User, len(userIDs))
				if len(userIDs) > 0 {
					uc, err := usersColl.Find(ctx, bson.M{"_id": bson.M{"$in": userIDs}})
					if err == nil {
						var users []models.User
						if err := uc.All(ctx, &users); err == nil {
							for _, u := range users {
								userMap[u.ID] = u
							}
						}
					}
				}

				for _, c := range coupons {
					voucherType := "negotiated"
					if c.Source == "cart_recovery" {
						voucherType = "cart_recovery"
					}
					if voucherType == "negotiated" && !includeNegotiated {
						continue
					}
					if voucherType == "cart_recovery" && !includeCartRecovery {
						continue
					}

					if search != "" {
						codeMatches := strings.Contains(strings.ToLower(c.Code), strings.ToLower(search))
						userMatches := searchUserIDs != nil && searchUserIDs[c.UserID]
						if !codeMatches && !userMatches {
							continue
						}
					}

					status := "active"
					if c.Used {
						status = "used"
					} else if now.After(c.ValidUntil) {
						status = "expired"
					}

					u := userMap[c.UserID]
					item := adminVoucherItem{
						ID:           c.ID.Hex(),
						Code:         c.Code,
						Type:         voucherType,
						DiscountType: c.Type,
						Value:        c.Value,
						Status:       status,
						ValidUntil:   c.ValidUntil.Format(time.RFC3339),
						CreatedAt:    c.CreatedAt.Format(time.RFC3339),
						UserID:       c.UserID.Hex(),
						UserName:     u.Name,
						UserPhone:    u.Phone,
					}
					for _, rp := range c.RequiredProducts {
						if vp, ok := resolveVoucherProduct(ctx, rp.ProductID, rp.Color, rp.ColorName); ok {
							item.RequiredProducts = append(item.RequiredProducts, vp)
						}
					}
					items = append(items, item)
				}
			}
		}
	}

	// Stats reflect the type filter (so switching tabs updates the counts)
	// but not the status filter, so every status count stays visible.
	stats := adminVoucherStats{Total: len(items)}
	for _, it := range items {
		switch it.Status {
		case "active":
			stats.Active++
		case "scheduled":
			stats.Scheduled++
		case "expired":
			stats.Expired++
		case "used":
			stats.Used++
		case "depleted":
			stats.Depleted++
		}
	}

	if statusFilter != "" {
		filtered := make([]adminVoucherItem, 0, len(items))
		for _, it := range items {
			if it.Status == statusFilter {
				filtered = append(filtered, it)
			}
		}
		items = filtered
	}

	sort.Slice(items, func(i, j int) bool {
		ti, _ := time.Parse(time.RFC3339, items[i].CreatedAt)
		tj, _ := time.Parse(time.RFC3339, items[j].CreatedAt)
		if sortBy == "oldest" {
			return ti.Before(tj)
		}
		return ti.After(tj)
	})

	total := len(items)
	totalPages := (total + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}
	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"vouchers": items[start:end],
		"pagination": map[string]interface{}{
			"currentPage":   page,
			"totalPages":    totalPages,
			"totalVouchers": total,
			"pageSize":      limit,
		},
		"stats": stats,
	})
}
