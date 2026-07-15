package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// --- Public endpoints ---

// GetBlogCategoriesPublic returns active categories with post counts for the public blog.
func GetBlogCategoriesPublic(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogCategoryRepository(db.Database)
	categories, err := repo.FindAllCategories(ctx)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch categories")
		return
	}

	utils.JSONResponse(w, http.StatusOK, categories)
}

// --- Admin endpoints ---

// GetAdminBlogCategories returns all categories (including inactive) for admin management.
func GetAdminBlogCategories(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogCategoryRepository(db.Database)
	categories, err := repo.FindAllCategoriesAdmin(ctx)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch categories")
		return
	}

	utils.JSONResponse(w, http.StatusOK, categories)
}

// CreateBlogCategory creates a new blog category.
func CreateBlogCategory(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description,omitempty"`
		Order       int    `json:"order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Category name is required")
		return
	}

	repo := services.NewBlogCategoryRepository(db.Database)

	// Check for duplicate name
	existing, _ := repo.FindByName(ctx, input.Name)
	if existing != nil {
		utils.ErrorResponse(w, http.StatusConflict, "Category with this name already exists")
		return
	}

	cat := &models.BlogCategory{
		Name:        input.Name,
		Slug:        services.GenerateCategorySlug(input.Name),
		Description: input.Description,
		Order:       input.Order,
		IsActive:    true,
		PostCount:   0,
	}

	if err := repo.InsertCategory(ctx, cat); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create category")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, cat)
}

// UpdateBlogCategory updates an existing blog category.
func UpdateBlogCategory(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Order       *int    `json:"order"`
		IsActive    *bool   `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	repo := services.NewBlogCategoryRepository(db.Database)

	// Verify category exists
	existing, err := repo.FindCategoryByID(ctx, id)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Category not found")
		return
	}

	update := bson.M{}

	if input.Name != nil {
		newName := strings.TrimSpace(*input.Name)
		if newName == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "Category name cannot be empty")
			return
		}
		// Check for duplicate name (excluding current category)
		dup, _ := repo.FindByName(ctx, newName)
		if dup != nil && dup.ID != existing.ID {
			utils.ErrorResponse(w, http.StatusConflict, "Category with this name already exists")
			return
		}
		update["name"] = newName
		update["slug"] = services.GenerateCategorySlug(newName)
	}

	if input.Description != nil {
		update["description"] = *input.Description
	}

	if input.Order != nil {
		update["order"] = *input.Order
	}

	if input.IsActive != nil {
		update["is_active"] = *input.IsActive
	}

	if len(update) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "No fields to update")
		return
	}

	if err := repo.UpdateCategory(ctx, id, update); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update category")
		return
	}

	updated, _ := repo.FindCategoryByID(ctx, id)
	utils.JSONResponse(w, http.StatusOK, updated)
}

// DeleteBlogCategory soft-deletes a blog category.
func DeleteBlogCategory(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	repo := services.NewBlogCategoryRepository(db.Database)
	if err := repo.DeleteCategory(ctx, id); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete category")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Category deleted"})
}

// HardDeleteBlogCategory permanently removes a blog category.
func HardDeleteBlogCategory(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	repo := services.NewBlogCategoryRepository(db.Database)

	existing, err := repo.FindCategoryByID(ctx, id)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Category not found")
		return
	}

	// Check if category has posts
	if existing.PostCount > 0 {
		utils.ErrorResponse(w, http.StatusConflict, "Cannot delete category with existing posts. Reassign posts first.")
		return
	}

	if err := repo.HardDeleteCategory(ctx, id); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete category")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Category permanently deleted"})
}

// RestoreBlogCategory restores a soft-deleted blog category.
func RestoreBlogCategory(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	repo := services.NewBlogCategoryRepository(db.Database)
	if err := repo.RestoreCategory(ctx, id); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to restore category")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Category restored"})
}

// RecountBlogCategories recalculates post counts for all categories.
func RecountBlogCategories(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	repo := services.NewBlogCategoryRepository(db.Database)
	if err := repo.RecountAllCategoryPosts(ctx); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to recount categories")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Category counts updated"})
}
