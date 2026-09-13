package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
)

// Identity merge engine.
//
// When an external (bot-channel) shadow user binds a phone that belongs to an
// existing registered account, everything the shadow ever accumulated moves to
// the registered account and the shadow becomes a tombstone. Data only ever
// flows external -> registered, and the registered account's own phone is
// never touched — the verified number simply stays where it already was.
//
// Crash safety: the tombstone is committed ONLY after every move succeeded.
// Any failed move aborts the merge (the lock is released, the shadow stays a
// live external account) and the caller can simply retry: every move filters
// on the shadow's user_id, so already-moved documents are no-ops on the next
// pass. Carts deactivate last and addresses dedupe on content, so partial
// progress converges. Concurrent merges serialize on the shadow's
// merge_state lock; a lock stamped more than mergeStaleLockAfter ago is taken
// over (a crashed process can never release it).

// IdentityMergeCollections lists every collection carrying user_id documents
// that must move during a merge. Carts and Reviews have dedicated mergers
// (unique-conflict resolution); everything else is a bulk re-point.
//
// KEEP THIS IN SYNC: when a new user-scoped collection is added to the
// backend, it must be added here. Wishlist is intentionally absent (storage
// stub); channel identities are re-pointed separately in step 7 so revoked
// rows stay where they are.
var IdentityMergeCollections = []string{
	"orders",
	"payment_attempts",
	"negotiated_coupons",
	"return_requests",
	"tickets",
	"tryon_chats",
	"checkout_chats",
	"chats",
	"virtual_tryons",
	"user_activities",
}

// mergeMaxItemQuantity clamps a merged cart line so two half-full carts
// cannot exceed what a single checkout would allow. It mirrors the
// add-to-cart behavior of clamping against stock.
const mergeMaxItemQuantity = 10

// mergeStaleLockAfter is how old a merge_state=in_progress stamp may get
// before another merge is allowed to take the lock over. A normal merge
// finishes in seconds; anything older is a crashed process whose deferred
// release can never run.
const mergeStaleLockAfter = 5 * time.Minute

// MergeResult reports what a merge moved, for the response and the audit log.
type MergeResult struct {
	ShadowID primitive.ObjectID
	TargetID primitive.ObjectID

	Moved          map[string]int64 // collection name -> documents re-pointed
	ReviewsDropped int64            // duplicates removed (target already reviewed the product)
	CartsMerged    int              // shadow carts folded into the target's cart
	Idempotent     bool             // true when the shadow was already merged into this target
}

// Sentinel errors for callers that need to branch.
var (
	ErrMergeSameAccount    = errors.New("merge source and target are the same account")
	ErrMergeTargetInvalid  = errors.New("merge target is missing, inactive, or already merged")
	ErrMergeTargetConflict = errors.New("merge source is already merged into a different account")
	// ErrMergeIncomplete — one or more moves failed, so the tombstone was
	// NOT committed. The shadow is untouched (still a live external
	// account); the caller can retry, and the retry only re-moves what is
	// left.
	ErrMergeIncomplete = errors.New("merge aborted before the tombstone; safe to retry")
)

// MergeExternalUserIntoRegistered folds the shadow account `shadowID` into the
// registered account `targetID`.
func MergeExternalUserIntoRegistered(
	ctx context.Context,
	database *mongo.Database,
	shadowID, targetID primitive.ObjectID,
) (*MergeResult, error) {
	if shadowID == targetID {
		return nil, ErrMergeSameAccount
	}
	users := database.Collection("users")

	// 1. Lock the shadow: only an un-merged external account may enter, and
	// only one merge at a time. FindOneAndUpdate is the mutex; the $or
	// alternative lets a lock left behind by a crashed process (older than
	// mergeStaleLockAfter) be taken over instead of blocking the user
	// forever.
	lockStamp := time.Now()
	var shadow models.User
	err := users.FindOneAndUpdate(ctx,
		bson.M{
			"_id":          shadowID,
			"account_type": models.AccountTypeExternal,
			"$or": []bson.M{
				{"merge_state": bson.M{"$ne": models.MergeStateInProgress}},
				{"merge_started_at": bson.M{"$lt": lockStamp.Add(-mergeStaleLockAfter)}},
			},
		},
		bson.M{"$set": bson.M{
			"merge_state":      models.MergeStateInProgress,
			"merge_started_at": lockStamp,
		}},
	).Decode(&shadow)
	if err != nil {
		if err != mongo.ErrNoDocuments {
			return nil, err
		}
		// No lock taken — find out why.
		var current models.User
		if err := users.FindOne(ctx, bson.M{"_id": shadowID}).Decode(&current); err != nil {
			if err == mongo.ErrNoDocuments {
				return nil, ErrMergeTargetInvalid
			}
			return nil, err
		}
		if current.IsMerged() && current.MergedInto != nil && *current.MergedInto == targetID {
			// Already merged into exactly this target: idempotent success.
			return &MergeResult{
				ShadowID: shadowID, TargetID: targetID,
				Moved: map[string]int64{}, Idempotent: true,
			}, nil
		}
		return nil, ErrMergeTargetConflict
	}

	// Everything after this point releases the lock on the way out — success
	// (the tombstone flips merge_state to done, so the release filter
	// matches nothing), validation failure, move failure or a dead context.
	// The release runs on a detached context: a 20s handler timeout expiring
	// mid-merge must still clear the flag, and it only clears the stamp THIS
	// merge wrote, so a stale-lock takeover by a later attempt is never
	// clobbered by the dying predecessor.
	defer releaseMergeLock(context.WithoutCancel(ctx), users, shadowID, lockStamp)

	result := &MergeResult{
		ShadowID: shadowID,
		TargetID: targetID,
		Moved:    make(map[string]int64),
	}

	// 2. Validate the target: active registered account.
	var target models.User
	if err := users.FindOne(ctx, bson.M{"_id": targetID}).Decode(&target); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrMergeTargetInvalid
		}
		return nil, err
	}
	if target.IsMerged() || !target.IsActive || target.EffectiveAccountType() == models.AccountTypeExternal {
		return nil, ErrMergeTargetInvalid
	}

	// 3. Kill the shadow's sessions first: after the re-point no token may
	// still act as the shadow. Best-effort and idempotent.
	refresh := NewRefreshTokenService(database)
	if err := refresh.RevokeAllForUser(ctx, shadowID, true); err != nil {
		log.Printf("identity merge %s -> %s: refresh revocation failed: %v", shadowID.Hex(), targetID.Hex(), err)
	}

	// 4-8. Move everything. ANY failure aborts the whole merge BEFORE the
	// tombstone: a half-moved shadow stays a live external account with its
	// remaining data attached, and the caller can retry (moves filter on
	// user_id, so retrying only moves what is left). Committing the
	// tombstone despite a failure would strand the un-moved documents on a
	// deactivated account — invisible to the survivor and unrecoverable.
	var firstErr error
	fail := func(stage string, err error) {
		if firstErr == nil {
			firstErr = err
		}
		log.Printf("identity merge %s -> %s: %s failed: %v", shadowID.Hex(), targetID.Hex(), stage, err)
	}

	// 4. Bulk re-point everything the registry knows about.
	for _, name := range IdentityMergeCollections {
		count, err := moveUserOwnedDocuments(ctx, database.Collection(name), shadowID, targetID)
		if err != nil {
			fail("moving "+name, err)
			continue
		}
		result.Moved[name] = count
	}

	// 5. Reviews: a product can only be reviewed once per account. Duplicate
	// shadow reviews are dropped, unique ones move.
	dropped, moved, err := mergeReviews(ctx, database, shadowID, targetID)
	if err != nil {
		fail("review merge", err)
	} else {
		result.ReviewsDropped = dropped
		result.Moved["reviews"] = moved
	}

	// 6. Carts: fold the shadow's active cart into the target's.
	if err := mergeCarts(ctx, database, shadowID, targetID); err != nil {
		fail("cart merge", err)
	} else {
		result.CartsMerged = 1
	}

	// 7. Addresses: append the shadow's addresses (deduped), exactly one default.
	if err := mergeAddresses(ctx, users, shadowID, targetID); err != nil {
		fail("address merge", err)
	}

	// 8. Re-point the shadow's active identities onto the target.
	identityCount, err := database.Collection("external_identities").UpdateMany(ctx,
		bson.M{"user_id": shadowID, "status": models.ExternalIdentityStatusActive},
		bson.M{"$set": bson.M{"user_id": targetID, "updated_at": time.Now()}},
	)
	if err != nil {
		fail("identity re-point", err)
	} else {
		result.Moved["external_identities"] = identityCount.ModifiedCount
	}

	if firstErr != nil {
		return nil, fmt.Errorf("%w: last failure: %v", ErrMergeIncomplete, firstErr)
	}

	// 9. Commit the tombstone in a single atomic write. Everything before this
	// is re-runnable; after this the merge is done.
	now := time.Now()
	if _, err := users.UpdateOne(ctx, bson.M{"_id": shadowID}, bson.M{
		"$set": bson.M{
			"account_type": models.AccountTypeMerged,
			"merged_into":  targetID,
			"is_active":    false,
			"merge_state":  models.MergeStateDone,
			"updated_at":   now,
		},
		"$inc": bson.M{"token_version": 1},
	}); err != nil {
		return nil, fmt.Errorf("commit merge tombstone: %w", err)
	}

	// 10. Audit row + best-effort webhook broadcast.
	_, _ = database.Collection("identity_merges").InsertOne(ctx, bson.M{
		"shadow_id":       shadowID,
		"target_id":       targetID,
		"moved":           result.Moved,
		"reviews_dropped": result.ReviewsDropped,
		"created_at":      now,
	})
	broadcastIdentityMerged(ctx, database, shadowID, targetID, result.Moved)

	return result, nil
}

// releaseMergeLock clears the in-progress flag after a failed merge so a
// later attempt is not blocked forever. Best-effort: it matches ONLY the lock
// stamped by the calling merge (merge_started_at == stamp), so a crashed
// predecessor whose release fires late cannot clear a newer attempt's lock.
func releaseMergeLock(ctx context.Context, users *mongo.Collection, shadowID primitive.ObjectID, stamp time.Time) {
	releaseCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	_, _ = users.UpdateOne(releaseCtx,
		bson.M{
			"_id":              shadowID,
			"merge_state":      models.MergeStateInProgress,
			"merge_started_at": stamp,
		},
		bson.M{"$set": bson.M{"merge_state": models.MergeStateIdle}},
	)
}

// moveUserOwnedDocuments re-points every user_id document from shadow to
// target. Filtering on user_id makes repeats no-ops.
func moveUserOwnedDocuments(ctx context.Context, collection *mongo.Collection, shadowID, targetID primitive.ObjectID) (int64, error) {
	res, err := collection.UpdateMany(ctx,
		bson.M{"user_id": shadowID},
		bson.M{"$set": bson.M{"user_id": targetID}},
	)
	if err != nil {
		return 0, err
	}
	return res.ModifiedCount, nil
}

// mergeReviews dedupes reviews by product: a product the target already
// reviewed causes the shadow's copy to be dropped, everything else moves.
func mergeReviews(ctx context.Context, database *mongo.Database, shadowID, targetID primitive.ObjectID) (dropped, moved int64, err error) {
	collection := database.Collection("reviews")
	cursor, err := collection.Find(ctx, bson.M{"user_id": shadowID}, options.Find().SetProjection(bson.M{"_id": 1, "product_id": 1}))
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)

	var reviews []struct {
		ID        primitive.ObjectID `bson:"_id"`
		ProductID primitive.ObjectID `bson:"product_id"`
	}
	if err := cursor.All(ctx, &reviews); err != nil {
		return 0, 0, err
	}

	for _, review := range reviews {
		dupCount, err := collection.CountDocuments(ctx, bson.M{
			"user_id":    targetID,
			"product_id": review.ProductID,
		})
		if err != nil {
			return dropped, moved, err
		}
		if dupCount > 0 {
			if _, err := collection.DeleteOne(ctx, bson.M{"_id": review.ID}); err != nil {
				return dropped, moved, err
			}
			dropped++
			continue
		}
		if _, err := collection.UpdateOne(ctx, bson.M{"_id": review.ID}, bson.M{"$set": bson.M{"user_id": targetID}}); err != nil {
			return dropped, moved, err
		}
		moved++
	}
	return dropped, moved, nil
}

// mergeCarts folds the shadow's most recent active cart into the target's
// active cart (or moves it wholesale when the target has none). The ordering
// is crash-safe on purpose: snapshot the shadow's carts FIRST, move or fold
// content BEFORE any deactivation, and deactivate the remaining shadow carts
// LAST — so a retried merge either short-circuits (no active shadow carts),
// no-ops on the moved cart (user_id filter) or re-folds with quantities
// clamped to live stock and the shared line cap.
func mergeCarts(ctx context.Context, database *mongo.Database, shadowID, targetID primitive.ObjectID) error {
	carts := database.Collection("carts")

	// Snapshot the shadow's active carts before touching anything.
	cursor, err := carts.Find(ctx, bson.M{"user_id": shadowID, "is_active": true},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return err
	}
	var shadowCarts []models.Cart
	if err := cursor.All(ctx, &shadowCarts); err != nil {
		cursor.Close(ctx)
		return err
	}
	cursor.Close(ctx)
	if len(shadowCarts) == 0 {
		return nil
	}

	var targetCart models.Cart
	err = carts.FindOne(ctx, bson.M{"user_id": targetID, "is_active": true},
		options.FindOne().SetSort(bson.D{{Key: "updated_at", Value: -1}}),
	).Decode(&targetCart)

	switch {
	case err == mongo.ErrNoDocuments:
		// No target cart: move the newest shadow cart wholesale. The
		// user_id filter makes a retried merge a no-op — the cart no
		// longer belongs to the shadow.
		if _, err := carts.UpdateOne(ctx,
			bson.M{"_id": shadowCarts[0].ID, "user_id": shadowID},
			bson.M{"$set": bson.M{"user_id": targetID, "is_active": true, "updated_at": time.Now()}},
		); err != nil {
			return err
		}
	case err != nil:
		return err
	default:
		// Target already has a cart: fold the newest shadow cart's lines
		// into it. Quantities clamp to live stock and the shared cap, so
		// a retried fold (crash before the deactivate below) is bounded.
		merged, changed := mergeCartLines(targetCart.Items, shadowCarts[0].Items, database, ctx)
		if changed {
			if _, err := carts.UpdateOne(ctx,
				bson.M{"_id": targetCart.ID},
				bson.M{"$set": bson.M{"items": merged, "updated_at": time.Now()}},
			); err != nil {
				return err
			}
		}
	}

	// Deactivate the remaining shadow carts LAST: until this succeeds the
	// merge is retriable, and a retried merge with no active shadow carts
	// short-circuits at the top.
	_, err = carts.UpdateMany(ctx,
		bson.M{"user_id": shadowID, "is_active": true},
		bson.M{"$set": bson.M{"is_active": false, "updated_at": time.Now()}},
	)
	return err
}

// mergeCartLines merges shadow items into target items keyed by
// (product_id, variant_id), clamping each merged quantity to the variant's
// live stock (best-effort). Returns the merged slice and whether anything
// changed.
func mergeCartLines(target, shadow []models.CartItem, database *mongo.Database, ctx context.Context) ([]models.CartItem, bool) {
	if len(shadow) == 0 {
		return target, false
	}
	merged := make([]models.CartItem, len(target))
	copy(merged, target)

	changed := false
	for _, item := range shadow {
		idx := -1
		for i := range merged {
			if merged[i].ProductID == item.ProductID && merged[i].Variant.VariantID == item.Variant.VariantID && merged[i].Variant.Size == item.Variant.Size {
				idx = i
				break
			}
		}
		if idx == -1 {
			merged = append(merged, item)
			changed = true
			continue
		}
		sum := merged[idx].Quantity + item.Quantity
		available := liveVariantStock(ctx, database, item.ProductID, item.Variant.VariantID, item.Variant.Size)
		if available > 0 && sum > available {
			sum = available
		}
		if sum > mergeMaxItemQuantity {
			sum = mergeMaxItemQuantity
		}
		if sum != merged[idx].Quantity {
			merged[idx].Quantity = sum
			changed = true
		}
	}
	return merged, changed
}

// liveVariantStock reads a variant's current quantity for clamping. Zero (or
// any lookup failure — including a nil database in tests) means "unknown — do
// not clamp", never "out of stock".
func liveVariantStock(ctx context.Context, database *mongo.Database, productID primitive.ObjectID, variantID, size string) int {
	if database == nil {
		return 0
	}
	var doc struct {
		ColorVariants []struct {
			VariantID string `bson:"variant_id"`
			Sizes     []struct {
				Size     string `bson:"size"`
				Quantity int    `bson:"quantity"`
			} `bson:"sizes"`
		} `bson:"color_variants"`
	}
	err := database.Collection("products").FindOne(ctx, bson.M{
		"_id":                       productID,
		"is_active":                 true,
		"color_variants.variant_id": variantID,
	}, options.FindOne().SetProjection(bson.M{"color_variants.variant_id": 1, "color_variants.sizes": 1}),
	).Decode(&doc)
	if err != nil {
		return 0
	}
	for _, variant := range doc.ColorVariants {
		if variant.VariantID != variantID {
			continue
		}
		for _, s := range variant.Sizes {
			if size != "" && s.Size != size {
				continue
			}
			return s.Quantity
		}
	}
	return 0
}

// mergeAddresses appends the shadow's addresses to the target's address book,
// deduping exact matches (same city, postal code, address text and phone) and
// keeping exactly one default address. A target with an EMPTY address book —
// the common registered-but-never-shipped case — adopts the shadow's list
// wholesale, with the first address as default.
func mergeAddresses(ctx context.Context, users *mongo.Collection, shadowID, targetID primitive.ObjectID) error {
	var shadowDoc struct {
		Addresses []models.Address `bson:"addresses"`
	}
	if err := users.FindOne(ctx, bson.M{"_id": shadowID}, options.FindOne().SetProjection(bson.M{"addresses": 1})).Decode(&shadowDoc); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil
		}
		return err
	}
	if len(shadowDoc.Addresses) == 0 {
		return nil
	}

	var doc struct {
		Addresses []models.Address `bson:"addresses"`
	}
	if err := users.FindOne(ctx, bson.M{"_id": targetID}, options.FindOne().SetProjection(bson.M{"addresses": 1})).Decode(&doc); err != nil {
		return err
	}

	seen := make(map[string]struct{}, len(doc.Addresses)+len(shadowDoc.Addresses))
	merged := make([]models.Address, 0, len(doc.Addresses)+len(shadowDoc.Addresses))
	for _, addr := range doc.Addresses {
		seen[addressKey(addr)] = struct{}{}
		merged = append(merged, addr)
	}
	appended := false
	for _, addr := range shadowDoc.Addresses {
		key := addressKey(addr)
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		addr.IsDefault = false // exactly one default survives the merge
		merged = append(merged, addr)
		appended = true
	}
	if !appended {
		return nil
	}
	// Exactly one default: the target's existing default is untouched; when
	// neither side had one (e.g. an empty target adopting the shadow's
	// list) the first address becomes it.
	hasDefault := false
	for _, addr := range merged {
		if addr.IsDefault {
			hasDefault = true
			break
		}
	}
	if !hasDefault && len(merged) > 0 {
		merged[0].IsDefault = true
	}
	_, err := users.UpdateOne(ctx, bson.M{"_id": targetID}, bson.M{
		"$set": bson.M{"addresses": merged, "updated_at": time.Now()},
	})
	return err
}

// addressKey is the dedupe key for merged addresses.
func addressKey(a models.Address) string {
	return a.City + "|" + a.PostalCode + "|" + a.Address + "|" + a.Street + "|" + a.PhoneNumber
}

// broadcastIdentityMerged pushes identity.merged to subscribed services.
// Best-effort: a webhook failure never rolls back a completed merge.
func broadcastIdentityMerged(ctx context.Context, database *mongo.Database, shadowID, targetID primitive.ObjectID, moved map[string]int64) {
	if _, err := BroadcastOutboundEvent(ctx, database, models.OutboundEventIdentityMerged, &targetID, map[string]interface{}{
		"shadow_id": shadowID.Hex(),
		"target_id": targetID.Hex(),
		"moved":     moved,
	}); err != nil {
		log.Printf("identity.merged webhook broadcast failed: %v", err)
	}
}
