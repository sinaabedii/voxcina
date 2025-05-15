package api

import (
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"backEnd/test"
)

func TestAdminEndpoints(t *testing.T) {
	api := test.NewTestAPI()

	// First register an admin user if we don't have one already
	if api.AdminToken == "" {
		// Try logging in with default admin credentials
		adminToken, err := api.Login("admin@example.com", "Admin123!@#")
		if err == nil {
			api.AdminToken = adminToken
		} else {
			// Register a new admin user
			adminEmail := "admin@example.com"
			adminPassword := "Admin123!@#"
			adminName := "Admin User"

			userID, _, err := api.Register(adminEmail, adminPassword, adminName)
			assert.NoError(t, err)

			// Update the user role to "admin" directly in the database
			err = api.UpdateUserRole(userID, "admin")
			assert.NoError(t, err)

			// After updating the role, log in again to get a token with admin privileges
			adminToken, err := api.Login(adminEmail, adminPassword)
			assert.NoError(t, err)

			// Store the admin token
			api.AdminToken = adminToken
			api.TestAdminID = userID
		}
	}

	// Skip admin tests if we couldn't get an admin token
	if api.AdminToken == "" {
		t.Skip("Skipping admin tests - could not get admin token")
		return
	}

	// Test list all users (admin only)
	resp, _, err := api.Request(http.MethodGet, "/admin/users", nil, api.AdminToken)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test user roles (admin only)
	// First we need a regular user ID
	resp, body, err := api.Request(http.MethodGet, "/admin/users", nil, api.AdminToken)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var result map[string]any
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)

	data, ok := result["data"].([]any)
	assert.True(t, ok)
	assert.NotEmpty(t, data)

	// Find a non-admin user
	var regularUserID string
	for _, u := range data {
		user := u.(map[string]any)
		role, _ := user["role"].(string)
		id, _ := user["id"].(string)
		if role != "admin" && id != api.TestAdminID {
			regularUserID = id
			break
		}
	}

	if regularUserID != "" {
		// Test updating user role
		updateRoleBody := map[string]any{
			"role": "admin",
		}
		resp, _, err = api.Request(
			http.MethodPut,
			"/admin/users/"+regularUserID+"/role",
			updateRoleBody,
			api.AdminToken,
		)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		// Change it back to regular user
		updateRoleBody = map[string]any{
			"role": "user",
		}
		resp, _, err = api.Request(
			http.MethodPut,
			"/admin/users/"+regularUserID+"/role",
			updateRoleBody,
			api.AdminToken,
		)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	}

	// Test create product category (admin only)
	categoryBody := map[string]any{
		"name": "Test Category " + time.Now().Format(time.RFC3339),
	}
	resp, body, err = api.Request(
		http.MethodPost,
		"/admin/categories",
		categoryBody,
		api.AdminToken,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var categoryResult map[string]any
	err = api.UnmarshalJSON(body, &categoryResult)
	assert.NoError(t, err)

	categoryData, ok := categoryResult["data"].(map[string]any)
	assert.True(t, ok)
	categoryID, ok := categoryData["id"].(string)
	assert.True(t, ok)

	// Test create product (admin only)
	productBody := map[string]any{
		"name":        "Test Product " + time.Now().Format(time.RFC3339),
		"description": "Test product description",
		"price":       99.99,
		"inventory":   100,
		"categoryId":  categoryID,
		"imageUrl":    "https://example.com/test-image.jpg",
	}
	resp, body, err = api.Request(
		http.MethodPost,
		"/admin/products",
		productBody,
		api.AdminToken,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var productResult map[string]any
	err = api.UnmarshalJSON(body, &productResult)
	assert.NoError(t, err)

	productData, ok := productResult["data"].(map[string]any)
	assert.True(t, ok)
	productID, ok := productData["id"].(string)
	assert.True(t, ok)

	// Test update product (admin only)
	updateProductBody := map[string]any{
		"name":        "Updated Test Product",
		"description": "Updated test product description",
		"price":       129.99,
		"inventory":   200,
	}
	resp, _, err = api.Request(
		http.MethodPut,
		"/admin/products/"+productID,
		updateProductBody,
		api.AdminToken,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test create discount (admin only)
	discountBody := map[string]any{
		"code":            "TEST" + time.Now().Format("150405"),
		"discountPercent": 10,
		"startDate":       time.Now().Format(time.RFC3339),
		"endDate": time.Now().
			AddDate(0, 1, 0).
			Format(time.RFC3339),
		// 1 month from now
		"isActive": true,
	}
	resp, body, err = api.Request(
		http.MethodPost,
		"/admin/discounts",
		discountBody,
		api.AdminToken,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var discountResult map[string]any
	err = api.UnmarshalJSON(body, &discountResult)
	assert.NoError(t, err)

	discountData, ok := discountResult["data"].(map[string]any)
	assert.True(t, ok)
	discountID, ok := discountData["id"].(string)
	assert.True(t, ok)

	// Test update discount (admin only)
	updateDiscountBody := map[string]any{
		"discountPercent": 15,
		"isActive":        false,
	}
	resp, _, err = api.Request(
		http.MethodPut,
		"/admin/discounts/"+discountID,
		updateDiscountBody,
		api.AdminToken,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test delete discount (admin only)
	resp, _, err = api.Request(
		http.MethodDelete,
		"/admin/discounts/"+discountID,
		nil,
		api.AdminToken,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test accessing admin endpoint with regular user token
	regularToken, err := api.Login("test@example.com", "Test123!@#")
	assert.NoError(t, err)

	resp, _, err = api.Request(http.MethodGet, "/admin/users", nil, regularToken)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)

	// Test delete product (admin only)
	resp, _, err = api.Request(
		http.MethodDelete,
		"/admin/products/"+productID,
		nil,
		api.AdminToken,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}
