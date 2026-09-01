package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateCareerSubmissionIndexes creates indexes for the /careers page inbox.
//
// career_submissions:
//  1. reference_code (unique) — the code handed back to the applicant; the
//     unique index is what makes the generator's collision retry meaningful.
//  2. type + created_at — the admin queue filtered to one tab, newest first.
//  3. status + created_at — the "new"/"reviewing" work queue.
//  4. created_at — the unfiltered queue.
//  5. email — look up every submission from the same person.
//
// career_resumes:
//  1. submission_id (unique) — one CV per submission; the download endpoint
//     resolves the file through it and a duplicate would be ambiguous.
func CreateCareerSubmissionIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	submissions := Database.Collection("career_submissions")
	submissionIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "reference_code", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("reference_code_unique"),
		},
		{
			Keys: bson.D{
				{Key: "type", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().SetName("type_created_idx"),
		},
		{
			Keys: bson.D{
				{Key: "status", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().SetName("status_created_idx"),
		},
		{
			Keys:    bson.D{{Key: "created_at", Value: -1}},
			Options: options.Index().SetName("created_idx"),
		},
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetName("email_idx"),
		},
	}

	log.Println("Creating career_submissions collection indexes...")
	if _, err := submissions.Indexes().CreateMany(ctx, submissionIndexes); err != nil {
		log.Printf("Error creating career_submissions indexes: %v", err)
		return err
	}

	resumes := Database.Collection("career_resumes")
	if _, err := resumes.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "submission_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("submission_unique"),
	}); err != nil {
		log.Printf("Error creating career_resumes indexes: %v", err)
		return err
	}

	log.Println("Successfully created career submission indexes")
	return nil
}
