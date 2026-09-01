package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const jobPositionsCollection = "job_positions"

// CreateJobPositionIndexes creates indexes for the admin-managed job postings
// listed on /careers.
//
//  1. title (unique) — two postings with the same title are indistinguishable
//     in the applicant's dropdown, so the database refuses them outright.
//  2. is_active + display_order — the public listing, in the admin's order.
//  3. display_order — the admin listing, which shows inactive postings too.
func CreateJobPositionIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	positions := Database.Collection(jobPositionsCollection)
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "title", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("title_unique"),
		},
		{
			Keys: bson.D{
				{Key: "is_active", Value: 1},
				{Key: "display_order", Value: 1},
			},
			Options: options.Index().SetName("active_order_idx"),
		},
		{
			Keys:    bson.D{{Key: "display_order", Value: 1}},
			Options: options.Index().SetName("display_order_idx"),
		},
	}

	log.Println("Creating job_positions collection indexes...")
	if _, err := positions.Indexes().CreateMany(ctx, indexes); err != nil {
		log.Printf("Error creating job_positions indexes: %v", err)
		return err
	}

	log.Println("Successfully created job position indexes")
	return nil
}

// SeedDefaultJobPositions fills an empty job_positions collection with the
// roles /careers advertised while the list was hardcoded in the frontend.
//
// It runs only when the collection is empty, so it is a one-time migration for
// an existing deployment and a sensible starting point for a fresh one — an
// admin who deletes every posting is not fighting a seeder that puts them back
// on the next restart. Everything here is editable from /admin/careers.
//
// The documents are written as bson.M rather than models.JobPosition because
// this package cannot import models without closing a models -> utils -> db
// import cycle; the keys below must stay in step with that struct's bson tags.
func SeedDefaultJobPositions() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	positions := Database.Collection(jobPositionsCollection)
	count, err := positions.EstimatedDocumentCount(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	now := time.Now()
	newPosition := func(title, department, employmentType, location, summary string, order int) bson.M {
		return bson.M{
			"title":           title,
			"department":      department,
			"employment_type": employmentType,
			"location":        location,
			"summary":         summary,
			"is_active":       true,
			"display_order":   order,
			"created_at":      now,
			"updated_at":      now,
		}
	}

	defaults := []interface{}{
		newPosition(
			"مدیر محصول", "محصول", "تمام‌وقت", "تهران",
			"هدایت نقشه راه محصول، اولویت‌بندی قابلیت‌ها و همکاری نزدیک با تیم‌های طراحی، فنی و بازرگانی.",
			10,
		),
		newPosition(
			"توسعه‌دهنده فرانت‌اند", "فناوری", "تمام‌وقت", "تهران / دورکاری",
			"توسعه رابط کاربری فروشگاه با Next.js و TypeScript، با تمرکز بر سرعت، دسترس‌پذیری و تجربه موبایل.",
			20,
		),
		newPosition(
			"متخصص بازاریابی دیجیتال", "بازاریابی", "تمام‌وقت", "تهران",
			"طراحی و اجرای کمپین‌های عملکردی، تحلیل داده‌های رشد و مدیریت کانال‌های شبکه‌های اجتماعی.",
			30,
		),
		// The general posting keeps the "no matching role? send it anyway"
		// route open now that an application must name a position.
		newPosition(
			"سایر موقعیت‌ها (ارسال رزومه عمومی)", "عمومی", "سایر", "تهران / دورکاری",
			"موقعیت موردنظرتان را در فهرست نمی‌بینید؟ رزومه‌تان را بفرستید تا در نخستین فرصت مناسب با شما تماس بگیریم.",
			40,
		),
	}

	if _, err := positions.InsertMany(ctx, defaults); err != nil {
		return err
	}

	log.Printf("Seeded %d default job positions", len(defaults))
	return nil
}
