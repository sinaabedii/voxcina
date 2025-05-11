package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"voxcina/test"
)

func TestDiscounts(t *testing.T) {
	api := test.NewTestAPI()
	
	// Test get all discounts
	resp, body, err := api.Request(http.MethodGet, "/discounts", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Parse response
	var result map[string]interface{}
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)
	assert.Contains(t, result, "data")
	
	// Check if there are any discounts
	data, ok := result["data"].([]interface{})
	assert.True(t, ok)
	
	// If there are discounts, test getting one by code
	if len(data) > 0 {
		discount := data[0].(map[string]interface{})
		discountCode, ok := discount["code"].(string)
		assert.True(t, ok)
		
		resp, body, err = api.Request(http.MethodGet, "/discounts/"+discountCode, nil, "")
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	}
	
	// Test nonexistent discount code
	resp, _, err = api.Request(http.MethodGet, "/discounts/NONEXISTENT", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	
	// Test applying discount to cart
	// First login
	token, err := api.Login("test@example.com", "test123")
	assert.NoError(t, err)
	
	// Add a product to cart
	resp, body, err = api.Request(http.MethodGet, "/products?limit=1", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)
	
	productData, ok := result["data"].([]interface{})
	if !assert.True(t, ok) || !assert.NotEmpty(t, productData) {
		t.FailNow()
	}
	
	product := productData[0].(map[string]interface{})
	productID := product["id"].(string)
	
	// Add item to cart
	addItemBody := map[string]interface{}{
		"productId": productID,
		"quantity":  2,
	}
	resp, _, err = api.Request(http.MethodPost, "/cart/items", addItemBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	
	// If we have a valid discount code, try to apply it
	if len(data) > 0 {
		discount := data[0].(map[string]interface{})
		discountCode, ok := discount["code"].(string)
		assert.True(t, ok)
		
		// Apply discount to cart
		applyDiscountBody := map[string]interface{}{
			"discountCode": discountCode,
		}
		resp, _, err = api.Request(http.MethodPost, "/cart/apply-discount", applyDiscountBody, token)
		assert.NoError(t, err)
		
		// Status could be OK or BadRequest if discount no longer valid or not applicable
		// Just check that we get a response
		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusBadRequest)
	}
	
	// Test applying invalid discount code
	invalidDiscountBody := map[string]interface{}{
		"discountCode": "INVALID",
	}
	resp, _, err = api.Request(http.MethodPost, "/cart/apply-discount", invalidDiscountBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
} 