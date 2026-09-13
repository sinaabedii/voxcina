package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateSellerVoucherIndexes backs the seller (affiliate) voucher feature:
//
//   - discounts.code unique — a promo code is resolved BY CODE at checkout, and
//     seller codes are minted by a retry-on-collision loop that is only sound if
//     the database is the one enforcing uniqueness. Created as a plain (not
//     partial) unique index because the whole collection shares one code
//     namespace.
//   - discounts.seller_id — every seller panel and admin report starts by
//     loading one seller's codes, or all seller-owned codes at once.
//   - orders.discount_code — the statistics pipeline matches orders by the
//     codes a seller owns; without this it is a collection scan per report.
//   - users.role — the admin sellers table lists users by role.
//
// Index creation is best-effort and never fatal: the code unique index is the
// one that can legitimately fail on an existing deployment, if duplicate codes
// were already inserted back when nothing enforced it. That is logged loudly —
// seller code minting still pre-checks for collisions, so it degrades to a
// small race window rather than breaking.
func CreateSellerVoucherIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	discounts := Database.Collection("discounts")
	if _, err := discounts.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "code", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("discount_code_unique"),
	}); err != nil {
		log.Printf(
			"WARNING: could not create the unique index on discounts.code (%v). "+
				"Duplicate promo codes may already exist; resolve them, because "+
				"checkout picks a code by name and a duplicate makes which "+
				"discount applies undefined.",
			err,
		)
	}

	if _, err := discounts.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "seller_id", Value: 1}, {Key: "created_at", Value: -1}},
		Options: options.Index().SetName("discount_seller_idx").SetSparse(true),
	}); err != nil {
		log.Printf("Error creating discounts seller index: %v", err)
		return err
	}

	if _, err := Database.Collection("orders").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "discount_code", Value: 1}},
		Options: options.Index().SetName("order_discount_code_idx").SetSparse(true),
	}); err != nil {
		log.Printf("Error creating orders discount_code index: %v", err)
		return err
	}

	if _, err := Database.Collection("users").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "role", Value: 1}},
		Options: options.Index().SetName("user_role_idx"),
	}); err != nil {
		log.Printf("Error creating users role index: %v", err)
		return err
	}

	log.Println("Seller voucher indexes ensured.")
	return nil
}
