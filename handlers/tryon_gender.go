package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
)

// Customer-gender resolution for the fitting-room agent's address rule.
//
// The agent kept calling female customers "داداش" because it had no fact
// about the customer's sex. Resolution runs once per user, cheapest source
// first — stored value, then the Persian first-name dictionary, then a single
// cheap LLM classification — and persists on the user document so later
// turns (and later conversations) cost nothing.

// resolveTryOnCustomerGender returns "male" or "female" for the prompt's
// address rule. Anything unresolvable — or any failure along the way —
// yields "" and the prompt then requires strictly neutral address instead
// of defaulting to masculine.
func resolveTryOnCustomerGender(ctx context.Context, userID primitive.ObjectID) string {
	var user models.User
	if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return ""
	}
	if user.Gender == models.GenderMale || user.Gender == models.GenderFemale {
		return user.Gender
	}
	firstName := userFirstName(user)
	if gender := services.GenderFromFirstName(firstName); gender == models.GenderMale || gender == models.GenderFemale {
		persistUserGender(ctx, userID, gender)
		return gender
	}
	if firstName == "" {
		return ""
	}
	gender, err := services.ClassifyCustomerGenderLLM(ctx, firstName)
	if err != nil {
		fmt.Printf("[tryon-chat] gender classification failed for user=%s: %v\n", userID.Hex(), err)
		return ""
	}
	if gender != models.GenderMale && gender != models.GenderFemale && gender != models.GenderUnknown {
		return ""
	}
	// Persist even "unknown": the LLM was already asked, so asking again on
	// every turn would burn money for the same answer.
	persistUserGender(ctx, userID, gender)
	if gender == models.GenderUnknown {
		return ""
	}
	return gender
}

// userFirstName prefers the explicit first-name field and falls back to the
// first token of the display name (via the shared firstNameOf helper), which
// is how the fitting room greets the customer as well.
func userFirstName(user models.User) string {
	if first := strings.TrimSpace(user.FirstName); first != "" {
		return first
	}
	return firstNameOf(user.Name)
}

// persistUserGender stores a resolved gender best-effort: a failed write
// must never fail the chat turn, it just means resolution retries next time.
func persistUserGender(ctx context.Context, userID primitive.ObjectID, gender string) {
	if _, err := db.Database.Collection("users").UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{"gender": gender, "updated_at": time.Now()}}); err != nil {
		fmt.Printf("[tryon-chat] gender persist failed for user=%s: %v\n", userID.Hex(), err)
	}
}
