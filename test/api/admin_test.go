package api

import (
	"bytes"
	"fmt"
	"io"
	"math/rand"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
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
			"role": "customer",
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
	// Using multipart form instead of JSON because the handler expects multipart
	categoryName := "Test Category " + time.Now().Format(time.RFC3339)
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add category name field (required)
	_ = writer.WriteField("name", categoryName)
	_ = writer.WriteField("description", "Test category description")

	// Try to add test image if it exists
	imagePath := "../test_files/test_category.png"
	if imageFile, err := os.Open(imagePath); err == nil {
		defer imageFile.Close()
		part, err := writer.CreateFormFile("image", filepath.Base(imagePath))
		if err == nil {
			io.Copy(part, imageFile)
		}
	}

	writer.Close()

	// Create custom request with multipart form
	req, err := http.NewRequest(
		http.MethodPost,
		api.BaseURL+"/admin/categories",
		&requestBody,
	)
	assert.NoError(t, err)

	// Set content type for multipart form
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+api.AdminToken)

	// Send the request
	client := &http.Client{}
	resp, err = client.Do(req)
	assert.NoError(t, err)
	defer resp.Body.Close()

	// Read response body
	body, err = io.ReadAll(resp.Body)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var categoryResult map[string]any
	err = api.UnmarshalJSON(body, &categoryResult)
	assert.NoError(t, err)

	categoryID, ok := categoryResult["id"].(string)
	assert.True(t, ok)
	assert.Equal(t, categoryName, categoryResult["name"])

	// Verify image path if an image was uploaded
	if _, err := os.Stat(imagePath); err == nil {
		assert.Contains(t, categoryResult["image"].(string), "/uploads/categories/")
	}

	// Test create product (admin only)
	// First, fetch brands to get a valid brandId
	resp, brandsBody, err := api.Request(http.MethodGet, "/api/brands", nil, "")
	assert.NoError(t, err)

	// Default fallback brandId in case we can't get a real one
	brandID := "507f1f77bcf86cd799439011" // Dummy MongoDB ObjectID

	// Try to parse the brands response and get a real brandId
	if resp.StatusCode == http.StatusOK {
		var brandsResult map[string]any
		err = api.UnmarshalJSON(brandsBody, &brandsResult)
		if err == nil {
			brandsData, ok := brandsResult["data"].([]any)
			if ok && len(brandsData) > 0 {
				// Randomly select a brand from the list
				randomIndex := rand.Intn(len(brandsData))
				brand, ok := brandsData[randomIndex].(map[string]any)
				if ok {
					if id, ok := brand["id"].(string); ok && id != "" {
						brandID = id
					}
				}
			}
		}
	}

	productName := "Test Product " + time.Now().Format(time.RFC3339)
	productDescription := "Test product description"
	productPrice := "99.99"

	// Build category IDs JSON array with the category we just created
	categoryIDsJSON := fmt.Sprintf("[\"%s\"]", categoryID)

	// Create variants JSON
	variantsJSON := `[
		{
			"size": "M",
			"color": "Red",
			"sku": "TEST-RED-M",
			"quantity": 50
		},
		{
			"size": "L",
			"color": "Blue",
			"sku": "TEST-BLUE-L",
			"quantity": 30
		}
	]`

	// Create attributes JSON
	attributesJSON := `[
		{
			"name": "Material",
			"value": "Cotton"
		},
		{
			"name": "Care",
			"value": "Machine wash cold"
		}
	]`

	// Create multipart form data - using productFormBody instead of requestBody
	var productFormBody bytes.Buffer
	productWriter := multipart.NewWriter(&productFormBody)

	// Add form fields
	_ = productWriter.WriteField("name", productName)
	_ = productWriter.WriteField("description", productDescription)
	_ = productWriter.WriteField("price", productPrice)
	_ = productWriter.WriteField("categoryIds", categoryIDsJSON)
	_ = productWriter.WriteField("brandId", brandID)
	_ = productWriter.WriteField("variants", variantsJSON)
	_ = productWriter.WriteField("attributes", attributesJSON)
	_ = productWriter.WriteField("isFlashSale", "false")
	_ = productWriter.WriteField("isActive", "true")

	// Add test product images
	imagePaths := []string{
		"../test_files/test_product1.jpg",
		"../test_files/test_product2.jpg",
	}

	for _, imagePath := range imagePaths {
		// Try to open the image file, skip if not found
		if imageFile, err := os.Open(imagePath); err == nil {
			defer imageFile.Close()
			fmt.Printf("Found test image: %s\n", imagePath)
			part, err := productWriter.CreateFormFile(
				"mainImages",
				filepath.Base(imagePath),
			)
			if err == nil {
				bytesWritten, err := io.Copy(part, imageFile)
				if err != nil {
					fmt.Printf("Error copying image to form: %v\n", err)
				} else {
					fmt.Printf("Successfully added %d bytes from %s to form\n", bytesWritten, imagePath)
				}
			} else {
				fmt.Printf("Error creating form file: %v\n", err)
			}
		} else {
			fmt.Printf("Test image not found: %s - %v\n", imagePath, err)
		}
	}

	productWriter.Close()

	// Create custom request with multipart form
	productReq, err := http.NewRequest(
		http.MethodPost,
		api.BaseURL+"/admin/products",
		&productFormBody,
	)
	assert.NoError(t, err)

	// Set content type for multipart form
	productReq.Header.Set("Content-Type", productWriter.FormDataContentType())
	productReq.Header.Set("Authorization", "Bearer "+api.AdminToken)

	// Send the request
	client = &http.Client{}
	resp, err = client.Do(productReq)
	assert.NoError(t, err)
	defer resp.Body.Close()

	// Read response body
	body, err = io.ReadAll(resp.Body)
	assert.NoError(t, err)

	// Print response for debugging
	fmt.Printf("Create product response status: %d\n", resp.StatusCode)
	fmt.Printf("Response body: %s\n", string(body))

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var productData map[string]any
	err = api.UnmarshalJSON(body, &productData)
	assert.NoError(t, err)

	_, ok = productData["id"].(string)
	assert.True(t, ok)

	// Verify product details
	assert.Equal(t, productName, productData["name"])
	assert.Equal(t, productDescription, productData["description"])

	// Check if images were uploaded
	images, ok := productData["images"].([]any)
	if len(imagePaths) > 0 && ok {
		assert.NotEmpty(t, images)
		for _, img := range images {
			imgPath, ok := img.(string)
			assert.True(t, ok)
			assert.Contains(t, imgPath, "/uploads/products/main/")
		}
	}

	// Verify variants
	variants, ok := productData["variants"].([]any)
	assert.True(t, ok)
	assert.Equal(t, 2, len(variants))

	// Verify attributes
	attributes, ok := productData["attributes"].([]any)
	assert.True(t, ok)
	assert.Equal(t, 2, len(attributes))

	// // Test update product (admin only) with JSON
	// updateProductBody := map[string]any{
	// 	"name":        "Updated Test Product",
	// 	"description": "Updated test product description",
	// 	"price":       129.99,
	// 	"variants": []map[string]any{
	// 		{
	// 			"size":     "M",
	// 			"color":    "Red",
	// 			"sku":      "TEST-RED-M",
	// 			"quantity": 100,
	// 		},
	// 		{
	// 			"size":     "L",
	// 			"color":    "Blue",
	// 			"sku":      "TEST-BLUE-L",
	// 			"quantity": 200,
	// 		},
	// 	},
	// }

	// resp, body, err = api.Request(
	// 	http.MethodPut,
	// 	"/admin/products/"+productID,
	// 	updateProductBody,
	// 	api.AdminToken,
	// )
	// assert.NoError(t, err)
	// if resp.StatusCode != http.StatusOK {
	// 	fmt.Println("Response body:", string(body))
	// }
	// assert.Equal(t, http.StatusOK, resp.StatusCode)

	// // Verify the update was successful and images were preserved
	// var updatedProduct map[string]interface{}
	// err = json.Unmarshal(body, &updatedProduct)
	// assert.NoError(t, err)

	// // Check that name was updated
	// assert.Equal(t, "Updated Test Product", updatedProduct["name"])

	// // Check that price was updated
	// assert.Equal(t, 129.99, updatedProduct["price"])

	// // Check that images still exist
	// images, ok = updatedProduct["images"].([]any)
	// assert.True(t, ok, "Images should be an array")
	// assert.NotEmpty(t, images, "Images should not be empty after update")

	// Test create discount (admin only)
	// 	discountBody := map[string]any{
	// 		"code":            "TEST" + time.Now().Format("150405"),
	// 		"discountPercent": 10,
	// 		"startDate":       time.Now().Format(time.RFC3339),
	// 		"endDate": time.Now().
	// 			AddDate(0, 1, 0).
	// 			Format(time.RFC3339),
	// 		// 1 month from now
	// 		"isActive": true,
	// 	}
	// 	resp, body, err = api.Request(
	// 		http.MethodPost,
	// 		"/admin/discounts",
	// 		discountBody,
	// 		api.AdminToken,
	// 	)
	// 	assert.NoError(t, err)
	// 	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	// 	var discountResult map[string]any
	// 	err = api.UnmarshalJSON(body, &discountResult)
	// 	assert.NoError(t, err)

	// 	discountData, ok := discountResult["data"].(map[string]any)
	// 	assert.True(t, ok)
	// 	discountID, ok := discountData["id"].(string)
	// 	assert.True(t, ok)

	// 	// Test update discount (admin only)
	// 	updateDiscountBody := map[string]any{
	// 		"discountPercent": 15,
	// 		"isActive":        false,
	// 	}
	// 	resp, _, err = api.Request(
	// 		http.MethodPut,
	// 		"/admin/discounts/"+discountID,
	// 		updateDiscountBody,
	// 		api.AdminToken,
	// 	)
	// 	assert.NoError(t, err)
	// 	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// 	// Test delete discount (admin only)
	// 	resp, _, err = api.Request(
	// 		http.MethodDelete,
	// 		"/admin/discounts/"+discountID,
	// 		nil,
	// 		api.AdminToken,
	// 	)
	// 	assert.NoError(t, err)
	// 	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// 	// Test accessing admin endpoint with regular user token
	// 	regularToken, err := api.Login("test@example.com", "Test123!@#")
	// 	assert.NoError(t, err)

	// 	resp, _, err = api.Request(http.MethodGet, "/admin/users", nil, regularToken)
	// 	assert.NoError(t, err)
	// 	assert.Equal(t, http.StatusForbidden, resp.StatusCode)

	// // Test delete product (admin only)
	// resp, _, err = api.Request(
	//
	//	http.MethodDelete,
	//	"/admin/products/"+productID,
	//	nil,
	//	api.AdminToken,
	//
	// )
	// assert.NoError(t, err)
	// assert.Equal(t, http.StatusOK, resp.StatusCode)
}
