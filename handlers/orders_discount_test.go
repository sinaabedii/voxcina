package handlers

import (
	"errors"
	"testing"

	"backEnd/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestValidateCheckoutDiscountEligibilityRejectsUnassignedUser(t *testing.T) {
	assignedUser := primitive.NewObjectID()
	unassignedUser := primitive.NewObjectID()
	discount := models.Discount{
		IsPublic:      false,
		AssignedUsers: []primitive.ObjectID{assignedUser},
	}

	if err := validateCheckoutDiscountEligibility(discount, unassignedUser); err == nil {
		t.Fatal("expected an assigned-user eligibility error")
	}
	if err := validateCheckoutDiscountEligibility(discount, assignedUser); err != nil {
		t.Fatalf("assigned user was rejected: %v", err)
	}
}

func TestCalculateAdminDiscountUsesApplicableProducts(t *testing.T) {
	targetProductID := primitive.NewObjectID()
	discount := models.Discount{
		Type:  "percentage",
		Value: 50,
		ApplicableTo: models.DiscountApplicability{
			ProductIDs: []primitive.ObjectID{targetProductID},
		},
	}
	items := []models.OrderItem{
		{ProductID: targetProductID, PriceAtPurchase: 100, Quantity: 2},
		{ProductID: primitive.NewObjectID(), PriceAtPurchase: 300, Quantity: 1},
	}

	if got, err := calculateAdminDiscount(discount, items, 500, nil); err != nil || got != 100 {
		t.Fatalf("discount = %v, want 100", got)
	}
}

func TestCalculateAdminDiscountUsesApplicableCategories(t *testing.T) {
	targetProductID := primitive.NewObjectID()
	discount := models.Discount{
		Type:  "fixed",
		Value: 150,
		ApplicableTo: models.DiscountApplicability{
			CategoryIDs: []primitive.ObjectID{primitive.NewObjectID()},
		},
	}
	items := []models.OrderItem{
		{ProductID: targetProductID, PriceAtPurchase: 200, Quantity: 1},
		{ProductID: primitive.NewObjectID(), PriceAtPurchase: 300, Quantity: 1},
	}

	categoryProductIDs := map[primitive.ObjectID]struct{}{targetProductID: {}}
	if got, err := calculateAdminDiscount(discount, items, 500, categoryProductIDs); err != nil || got != 150 {
		t.Fatalf("discount = %v, err = %v, want 150 with no error", got, err)
	}
}

func TestCalculateAdminDiscountEnforcesMinimumOrderAmount(t *testing.T) {
	discount := models.Discount{
		Type:           "fixed",
		Value:          200,
		MinOrderAmount: 500,
	}
	items := []models.OrderItem{{PriceAtPurchase: 100, Quantity: 1}}

	if got, err := calculateAdminDiscount(discount, items, 499, nil); !errors.Is(err, errDiscountMinimumOrder) || got != 0 {
		t.Fatalf("discount below minimum = %v, err = %v", got, err)
	}
	if got, err := calculateAdminDiscount(discount, []models.OrderItem{{PriceAtPurchase: 500, Quantity: 1}}, 500, nil); err != nil || got != 200 {
		t.Fatalf("discount at minimum = %v, err = %v, want 200 with no error", got, err)
	}
}

func TestCalculateAdminDiscountRejectsCartWithoutScopedProduct(t *testing.T) {
	discount := models.Discount{
		Type:  "percentage",
		Value: 20,
		ApplicableTo: models.DiscountApplicability{
			ProductIDs: []primitive.ObjectID{primitive.NewObjectID()},
		},
	}
	items := []models.OrderItem{{ProductID: primitive.NewObjectID(), PriceAtPurchase: 500, Quantity: 1}}

	if got, err := calculateAdminDiscount(discount, items, 500, nil); !errors.Is(err, errDiscountProductScope) || got != 0 {
		t.Fatalf("unmatched scope = %v, err = %v", got, err)
	}
}
