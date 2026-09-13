package services

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
)

// VoucherPerformance is everything measurable about one seller voucher code.
//
// The money fields split into three layers on purpose, because they answer
// three different questions and only the last one is a payable number:
//
//	GrossSubtotal    what the merchandise listed for, before any discount
//	CustomerDiscount what the shopper saved via this code
//	NetMerchandise   GrossSubtotal - CustomerDiscount
//	ReturnedValue    list value of items sent back on an approved return
//	CommissionBase   NetMerchandise, less the returned portion of it
//	Commission       SellerSharePercent% of CommissionBase  <- what is owed
//
// Only orders that were actually paid and not cancelled feed those figures.
// The Orders* counters below report the full funnel anyway, so an unpaid or
// cancelled order is visible rather than quietly dropped.
type VoucherPerformance struct {
	Code               string     `json:"code"`
	DiscountPercent    int        `json:"discount_percent"`
	SellerSharePercent int        `json:"seller_share_percent"`
	Status             string     `json:"status"`
	CreatedAt          time.Time  `json:"created_at"`
	ValidFrom          time.Time  `json:"valid_from"`
	ValidTo            time.Time  `json:"valid_to"`
	FirstUsedAt        *time.Time `json:"first_used_at,omitempty"`
	LastUsedAt         *time.Time `json:"last_used_at,omitempty"`

	OrdersTotal     int `json:"orders_total"`
	OrdersPaid      int `json:"orders_paid"`
	OrdersPending   int `json:"orders_pending"`
	OrdersCancelled int `json:"orders_cancelled"`
	OrdersDelivered int `json:"orders_delivered"`
	OrdersReturned  int `json:"orders_returned"`
	UniqueCustomers int `json:"unique_customers"`

	GrossSubtotal    float64 `json:"gross_subtotal"`
	CustomerDiscount float64 `json:"customer_discount"`
	NetMerchandise   float64 `json:"net_merchandise"`
	ReturnedValue    float64 `json:"returned_value"`
	CommissionBase   float64 `json:"commission_base"`
	Commission       float64 `json:"commission"`
	RevenueCollected float64 `json:"revenue_collected"`
	AvgOrderValue    float64 `json:"avg_order_value"`
	ItemsSold        int     `json:"items_sold"`
}

// SellerPerformance rolls every code a seller owns into one payable total.
type SellerPerformance struct {
	SellerID           primitive.ObjectID   `json:"seller_id"`
	Name               string               `json:"name"`
	Phone              string               `json:"phone,omitempty"`
	Email              string               `json:"email,omitempty"`
	IsActive           bool                 `json:"is_active"`
	JoinedAt           time.Time            `json:"joined_at"`
	Vouchers           []VoucherPerformance `json:"vouchers"`
	VoucherCount       int                  `json:"voucher_count"`
	ActiveVoucherCount int                  `json:"active_voucher_count"`

	OrdersTotal     int `json:"orders_total"`
	OrdersPaid      int `json:"orders_paid"`
	OrdersPending   int `json:"orders_pending"`
	OrdersCancelled int `json:"orders_cancelled"`
	OrdersDelivered int `json:"orders_delivered"`
	OrdersReturned  int `json:"orders_returned"`
	UniqueCustomers int `json:"unique_customers"`

	GrossSubtotal    float64 `json:"gross_subtotal"`
	CustomerDiscount float64 `json:"customer_discount"`
	NetMerchandise   float64 `json:"net_merchandise"`
	ReturnedValue    float64 `json:"returned_value"`
	CommissionBase   float64 `json:"commission_base"`
	Commission       float64 `json:"commission"`
	RevenueCollected float64 `json:"revenue_collected"`
	AvgOrderValue    float64 `json:"avg_order_value"`
	ItemsSold        int     `json:"items_sold"`
}

// AttributedOrder is one order credited to a seller code, for the drill-down
// list under a seller or a single voucher.
type AttributedOrder struct {
	OrderID       primitive.ObjectID `json:"order_id"`
	OrderNumber   string             `json:"order_number"`
	Code          string             `json:"code"`
	CustomerName  string             `json:"customer_name,omitempty"`
	Status        string             `json:"status"`
	PaymentStatus string             `json:"payment_status"`
	Countable     bool               `json:"countable"`
	Subtotal      float64            `json:"subtotal"`
	Discount      float64            `json:"discount"`
	ReturnedValue float64            `json:"returned_value"`
	Commission    float64            `json:"commission"`
	TotalAmount   float64            `json:"total_amount"`
	CreatedAt     time.Time          `json:"created_at"`
}

// voucherAggregate is the raw per-code roll-up the pipeline emits. The seller's
// percentage is NOT applied here: the share lives on the discount document, so
// it is multiplied in afterwards where both are in hand.
type voucherAggregate struct {
	Code             string               `bson:"_id"`
	OrdersTotal      int                  `bson:"orders_total"`
	OrdersPaid       int                  `bson:"orders_paid"`
	OrdersPending    int                  `bson:"orders_pending"`
	OrdersCancelled  int                  `bson:"orders_cancelled"`
	OrdersDelivered  int                  `bson:"orders_delivered"`
	OrdersReturned   int                  `bson:"orders_returned"`
	Customers        []primitive.ObjectID `bson:"customers"`
	GrossSubtotal    float64              `bson:"gross_subtotal"`
	CustomerDiscount float64              `bson:"customer_discount"`
	ReturnedValue    float64              `bson:"returned_value"`
	CommissionBase   float64              `bson:"commission_base"`
	RevenueCollected float64              `bson:"revenue_collected"`
	ItemsSold        int                  `bson:"items_sold"`
	FirstUsedAt      *time.Time           `bson:"first_used_at"`
	LastUsedAt       *time.Time           `bson:"last_used_at"`
}

// orderMerchandiseStage computes, for each order, the figures every downstream
// stage needs. Shared by the roll-up and the drill-down so the two can never
// disagree about what an order is worth.
//
// `subtotal` is summed from the item snapshots rather than read from
// total_amount, which also carries shipping and tax — neither is part of the
// budget a seller splits.
//
// `countable` is the commission gate agreed with the shop: paid, and not
// cancelled. A soft-deleted order is excluded earlier, by the match stage.
func orderMerchandiseStages() []bson.M {
	return []bson.M{
		{"$addFields": bson.M{
			"subtotal": bson.M{"$sum": bson.M{"$map": bson.M{
				"input": bson.M{"$ifNull": []interface{}{"$items", bson.A{}}},
				"as":    "i",
				"in": bson.M{"$multiply": []interface{}{
					bson.M{"$ifNull": []interface{}{"$$i.price_at_purchase", 0}},
					bson.M{"$ifNull": []interface{}{"$$i.quantity", 0}},
				}},
			}}},
			"items_count": bson.M{"$sum": bson.M{"$map": bson.M{
				"input": bson.M{"$ifNull": []interface{}{"$items", bson.A{}}},
				"as":    "i",
				"in":    bson.M{"$ifNull": []interface{}{"$$i.quantity", 0}},
			}}},
		}},
		// Approved returns only. A pending or rejected request has not taken
		// merchandise back, so it must not reduce what the seller is owed.
		{"$lookup": bson.M{
			"from": "return_requests",
			"let":  bson.M{"oid": "$_id"},
			"pipeline": []bson.M{
				{"$match": bson.M{"$expr": bson.M{"$and": []interface{}{
					bson.M{"$eq": []interface{}{"$order_id", "$$oid"}},
					bson.M{"$eq": []interface{}{"$status", models.ReturnStatusApproved}},
				}}}},
				{"$project": bson.M{"value": bson.M{"$sum": bson.M{"$map": bson.M{
					"input": bson.M{"$ifNull": []interface{}{"$items", bson.A{}}},
					"as":    "i",
					"in": bson.M{"$multiply": []interface{}{
						bson.M{"$ifNull": []interface{}{"$$i.price_at_purchase", 0}},
						bson.M{"$ifNull": []interface{}{"$$i.quantity", 0}},
					}},
				}}}}},
			},
			"as": "approved_returns",
		}},
		{"$addFields": bson.M{
			"returned_value": bson.M{"$sum": "$approved_returns.value"},
			"countable": bson.M{"$and": []interface{}{
				bson.M{"$eq": []interface{}{"$payment_status", "paid"}},
				bson.M{"$ne": []interface{}{"$status", "cancelled"}},
			}},
		}},
		// The discount was spread across the whole order, so a partial return
		// takes back a proportional slice of the net merchandise rather than
		// its full list value. kept_ratio is that slice; guarding on
		// subtotal > 0 keeps a zero-value order from dividing by zero.
		{"$addFields": bson.M{
			"net_merchandise": bson.M{"$subtract": []interface{}{
				"$subtotal",
				bson.M{"$ifNull": []interface{}{"$discount_amount", 0}},
			}},
			"kept_ratio": bson.M{"$cond": []interface{}{
				bson.M{"$gt": []interface{}{"$subtotal", 0}},
				bson.M{"$divide": []interface{}{
					bson.M{"$max": []interface{}{
						bson.M{"$subtract": []interface{}{"$subtotal", "$returned_value"}},
						0,
					}},
					"$subtotal",
				}},
				0,
			}},
		}},
		{"$addFields": bson.M{
			"commission_base": bson.M{"$cond": []interface{}{
				"$countable",
				bson.M{"$max": []interface{}{
					bson.M{"$multiply": []interface{}{"$net_merchandise", "$kept_ratio"}},
					0,
				}},
				0,
			}},
		}},
	}
}

// aggregateVoucherPerformance rolls the orders that used `codes` up by code.
// Codes with no orders yet simply do not appear; the caller fills them in as
// zero rows so a freshly minted voucher is still listed.
func aggregateVoucherPerformance(ctx context.Context, orders *mongo.Collection, codes []string) (map[string]voucherAggregate, error) {
	if len(codes) == 0 {
		return map[string]voucherAggregate{}, nil
	}

	pipeline := []bson.M{
		{"$match": bson.M{
			"discount_code": bson.M{"$in": codes},
			"is_active":     bson.M{"$ne": false},
		}},
	}
	pipeline = append(pipeline, orderMerchandiseStages()...)
	pipeline = append(pipeline, bson.M{"$group": bson.M{
		"_id":          "$discount_code",
		"orders_total": bson.M{"$sum": 1},
		"orders_paid":  bson.M{"$sum": bson.M{"$cond": []interface{}{"$countable", 1, 0}}},
		"orders_pending": bson.M{"$sum": bson.M{"$cond": []interface{}{
			bson.M{"$ne": []interface{}{"$payment_status", "paid"}}, 1, 0,
		}}},
		"orders_cancelled": bson.M{"$sum": bson.M{"$cond": []interface{}{
			bson.M{"$eq": []interface{}{"$status", "cancelled"}}, 1, 0,
		}}},
		"orders_delivered": bson.M{"$sum": bson.M{"$cond": []interface{}{
			bson.M{"$eq": []interface{}{"$status", "delivered"}}, 1, 0,
		}}},
		"orders_returned": bson.M{"$sum": bson.M{"$cond": []interface{}{
			bson.M{"$gt": []interface{}{"$returned_value", 0}}, 1, 0,
		}}},
		// Only paying customers count as customers.
		"customers": bson.M{"$addToSet": bson.M{"$cond": []interface{}{
			"$countable", "$user_id", "$$REMOVE",
		}}},
		"gross_subtotal": bson.M{"$sum": bson.M{"$cond": []interface{}{"$countable", "$subtotal", 0}}},
		"customer_discount": bson.M{"$sum": bson.M{"$cond": []interface{}{
			"$countable", bson.M{"$ifNull": []interface{}{"$discount_amount", 0}}, 0,
		}}},
		"returned_value":  bson.M{"$sum": bson.M{"$cond": []interface{}{"$countable", "$returned_value", 0}}},
		"commission_base": bson.M{"$sum": "$commission_base"},
		"revenue_collected": bson.M{"$sum": bson.M{"$cond": []interface{}{
			"$countable", bson.M{"$ifNull": []interface{}{"$total_amount", 0}}, 0,
		}}},
		"items_sold":    bson.M{"$sum": bson.M{"$cond": []interface{}{"$countable", "$items_count", 0}}},
		"first_used_at": bson.M{"$min": bson.M{"$cond": []interface{}{"$countable", "$created_at", "$$REMOVE"}}},
		"last_used_at":  bson.M{"$max": bson.M{"$cond": []interface{}{"$countable", "$created_at", "$$REMOVE"}}},
	}})

	cursor, err := orders.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	out := make(map[string]voucherAggregate, len(codes))
	for cursor.Next(ctx) {
		var row voucherAggregate
		if err := cursor.Decode(&row); err != nil {
			return nil, err
		}
		out[row.Code] = row
	}
	return out, cursor.Err()
}

// voucherStatus labels a code for the UI the same way the admin vouchers table
// does: scheduled before it opens, expired after it closes, depleted once
// max_uses is reached, otherwise active.
func voucherStatus(d models.Discount, now time.Time) string {
	switch {
	case now.Before(d.ValidFrom):
		return "scheduled"
	case now.After(d.ValidTo):
		return "expired"
	case d.MaxUses > 0 && d.UsedCount >= d.MaxUses:
		return "depleted"
	default:
		return "active"
	}
}

// BuildVoucherPerformance turns seller discount documents plus their order
// roll-up into the reportable shape, applying each code's own share.
func BuildVoucherPerformance(vouchers []models.Discount, agg map[string]voucherAggregate, now time.Time) []VoucherPerformance {
	out := make([]VoucherPerformance, 0, len(vouchers))
	for _, v := range vouchers {
		row := agg[v.Code]
		perf := VoucherPerformance{
			Code:               v.Code,
			DiscountPercent:    int(v.Value),
			SellerSharePercent: v.SellerSharePercent,
			Status:             voucherStatus(v, now),
			CreatedAt:          v.CreatedAt,
			ValidFrom:          v.ValidFrom,
			ValidTo:            v.ValidTo,
			FirstUsedAt:        row.FirstUsedAt,
			LastUsedAt:         row.LastUsedAt,

			OrdersTotal:     row.OrdersTotal,
			OrdersPaid:      row.OrdersPaid,
			OrdersPending:   row.OrdersPending,
			OrdersCancelled: row.OrdersCancelled,
			OrdersDelivered: row.OrdersDelivered,
			OrdersReturned:  row.OrdersReturned,
			UniqueCustomers: len(row.Customers),

			GrossSubtotal:    row.GrossSubtotal,
			CustomerDiscount: row.CustomerDiscount,
			NetMerchandise:   row.GrossSubtotal - row.CustomerDiscount,
			ReturnedValue:    row.ReturnedValue,
			CommissionBase:   row.CommissionBase,
			Commission:       row.CommissionBase * float64(v.SellerSharePercent) / 100,
			RevenueCollected: row.RevenueCollected,
			ItemsSold:        row.ItemsSold,
		}
		if perf.OrdersPaid > 0 {
			perf.AvgOrderValue = perf.RevenueCollected / float64(perf.OrdersPaid)
		}
		out = append(out, perf)
	}
	return out
}

// RollUpSeller sums a seller's codes into their payable total.
//
// Unique customers cannot be summed across codes — the same shopper may have
// used two of them — so that one figure is recomputed from the raw sets.
func RollUpSeller(perf []VoucherPerformance, agg map[string]voucherAggregate) SellerPerformance {
	var out SellerPerformance
	out.Vouchers = perf
	out.VoucherCount = len(perf)

	seen := map[primitive.ObjectID]struct{}{}
	for _, p := range perf {
		if p.Status == "active" {
			out.ActiveVoucherCount++
		}
		out.OrdersTotal += p.OrdersTotal
		out.OrdersPaid += p.OrdersPaid
		out.OrdersPending += p.OrdersPending
		out.OrdersCancelled += p.OrdersCancelled
		out.OrdersDelivered += p.OrdersDelivered
		out.OrdersReturned += p.OrdersReturned
		out.GrossSubtotal += p.GrossSubtotal
		out.CustomerDiscount += p.CustomerDiscount
		out.NetMerchandise += p.NetMerchandise
		out.ReturnedValue += p.ReturnedValue
		out.CommissionBase += p.CommissionBase
		out.Commission += p.Commission
		out.RevenueCollected += p.RevenueCollected
		out.ItemsSold += p.ItemsSold

		for _, id := range agg[p.Code].Customers {
			seen[id] = struct{}{}
		}
	}
	out.UniqueCustomers = len(seen)
	if out.OrdersPaid > 0 {
		out.AvgOrderValue = out.RevenueCollected / float64(out.OrdersPaid)
	}
	return out
}

// SellerVoucherStats loads a seller's codes, measures them, and returns both
// the per-code rows and the roll-up. Codes are passed in by the caller so the
// same function serves "one seller" and "one voucher".
func SellerVoucherStats(ctx context.Context, database *mongo.Database, vouchers []models.Discount, now time.Time) ([]VoucherPerformance, SellerPerformance, error) {
	codes := make([]string, 0, len(vouchers))
	for _, v := range vouchers {
		codes = append(codes, v.Code)
	}

	agg, err := aggregateVoucherPerformance(ctx, database.Collection("orders"), codes)
	if err != nil {
		return nil, SellerPerformance{}, err
	}

	perf := BuildVoucherPerformance(vouchers, agg, now)
	return perf, RollUpSeller(perf, agg), nil
}

// AttributedOrders lists the individual orders behind the totals, newest first.
// `shares` maps a code to its seller percentage so each row can carry the
// commission that order actually earned.
func AttributedOrders(ctx context.Context, database *mongo.Database, codes []string, shares map[string]int, limit int) ([]AttributedOrder, error) {
	if len(codes) == 0 {
		return []AttributedOrder{}, nil
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	pipeline := []bson.M{
		{"$match": bson.M{
			"discount_code": bson.M{"$in": codes},
			"is_active":     bson.M{"$ne": false},
		}},
	}
	pipeline = append(pipeline, orderMerchandiseStages()...)
	pipeline = append(pipeline,
		bson.M{"$sort": bson.M{"created_at": -1}},
		bson.M{"$limit": limit},
		bson.M{"$lookup": bson.M{
			"from":         "users",
			"localField":   "user_id",
			"foreignField": "_id",
			"as":           "customer",
		}},
		bson.M{"$project": bson.M{
			"order_number":    1,
			"discount_code":   1,
			"status":          1,
			"payment_status":  1,
			"countable":       1,
			"subtotal":        1,
			"discount_amount": 1,
			"returned_value":  1,
			"commission_base": 1,
			"total_amount":    1,
			"created_at":      1,
			"customer_name":   bson.M{"$arrayElemAt": []interface{}{"$customer.name", 0}},
		}},
	)

	cursor, err := database.Collection("orders").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	out := make([]AttributedOrder, 0, limit)
	for cursor.Next(ctx) {
		var row struct {
			ID             primitive.ObjectID `bson:"_id"`
			OrderNumber    string             `bson:"order_number"`
			Code           string             `bson:"discount_code"`
			Status         string             `bson:"status"`
			PaymentStatus  string             `bson:"payment_status"`
			Countable      bool               `bson:"countable"`
			Subtotal       float64            `bson:"subtotal"`
			DiscountAmount float64            `bson:"discount_amount"`
			ReturnedValue  float64            `bson:"returned_value"`
			CommissionBase float64            `bson:"commission_base"`
			TotalAmount    float64            `bson:"total_amount"`
			CreatedAt      time.Time          `bson:"created_at"`
			CustomerName   string             `bson:"customer_name"`
		}
		if err := cursor.Decode(&row); err != nil {
			return nil, err
		}
		out = append(out, AttributedOrder{
			OrderID:       row.ID,
			OrderNumber:   row.OrderNumber,
			Code:          row.Code,
			CustomerName:  row.CustomerName,
			Status:        row.Status,
			PaymentStatus: row.PaymentStatus,
			Countable:     row.Countable,
			Subtotal:      row.Subtotal,
			Discount:      row.DiscountAmount,
			ReturnedValue: row.ReturnedValue,
			Commission:    row.CommissionBase * float64(shares[row.Code]) / 100,
			TotalAmount:   row.TotalAmount,
			CreatedAt:     row.CreatedAt,
		})
	}
	return out, cursor.Err()
}

// MeasureSellers measures every listed seller in ONE pass over the orders.
//
// The admin sellers table needs the same figures for everybody at once, and
// running SellerVoucherStats per seller would re-scan the orders collection
// once per row. This aggregates across all their codes together and then
// splits the result by owner.
//
// Sellers with no codes yet come back as a zero row rather than being dropped,
// so a newly promoted partner is still visible in the table.
func MeasureSellers(
	ctx context.Context,
	database *mongo.Database,
	vouchersBySeller map[primitive.ObjectID][]models.Discount,
	now time.Time,
) (map[primitive.ObjectID]SellerPerformance, error) {
	allCodes := make([]string, 0)
	for _, vouchers := range vouchersBySeller {
		for _, v := range vouchers {
			allCodes = append(allCodes, v.Code)
		}
	}

	agg, err := aggregateVoucherPerformance(ctx, database.Collection("orders"), allCodes)
	if err != nil {
		return nil, err
	}

	out := make(map[primitive.ObjectID]SellerPerformance, len(vouchersBySeller))
	for sellerID, vouchers := range vouchersBySeller {
		perf := BuildVoucherPerformance(vouchers, agg, now)
		summary := RollUpSeller(perf, agg)
		summary.SellerID = sellerID
		out[sellerID] = summary
	}
	return out, nil
}
