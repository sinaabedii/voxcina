package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"voxcina/test"
)

func TestCheckoutAndOrders(t *testing.T) {
	api := test.NewTestAPI()
	
	// Login to get token
	token, err := api.Login("test@example.com", "test123")
	assert.NoError(t, err)
	
	// First get a product ID to add to cart
	resp, body, err := api.Request(http.MethodGet, "/products?limit=1", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	var result map[string]interface{}
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)
	
	data, ok := result["data"].([]interface{})
	if !assert.True(t, ok) || !assert.NotEmpty(t, data) {
		t.FailNow()
	}
	
	product := data[0].(map[string]interface{})
	productID := product["id"].(string)
	
	// Add item to cart
	addItemBody := map[string]interface{}{
		"productId": productID,
		"quantity":  2,
	}
	resp, _, err = api.Request(http.MethodPost, "/cart/items", addItemBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	
	// Get user addresses to use for checkout
	resp, body, err = api.Request(http.MethodGet, "/users/profile", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	var profileResult map[string]interface{}
	err = api.UnmarshalJSON(body, &profileResult)
	assert.NoError(t, err)
	
	profileData, ok := profileResult["data"].(map[string]interface{})
	assert.True(t, ok)
	
	var addressID string
	addresses, ok := profileData["addresses"].([]interface{})
	
	// If no addresses exist, create one
	if !ok || len(addresses) == 0 {
		// Create an address
		addressBody := map[string]interface{}{
			"street":    "123 Test St",
			"city":      "Test City",
			"state":     "Test State",
			"country":   "Test Country",
			"zipCode":   "12345",
			"isDefault": true,
		}
		resp, body, err = api.Request(http.MethodPost, "/users/addresses", addressBody, token)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		
		var addressResult map[string]interface{}
		err = api.UnmarshalJSON(body, &addressResult)
		assert.NoError(t, err)
		
		addressData, ok := addressResult["data"].(map[string]interface{})
		assert.True(t, ok)
		addressID, ok = addressData["id"].(string)
		assert.True(t, ok)
	} else {
		address := addresses[0].(map[string]interface{})
		addressID, ok = address["id"].(string)
		assert.True(t, ok)
	}
	
	// Checkout
	checkoutBody := map[string]interface{}{
		"addressId":    addressID,
		"paymentMethod": "cash_on_delivery",
	}
	resp, body, err = api.Request(http.MethodPost, "/orders/checkout", checkoutBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	
	// Parse order result to get order ID
	var orderResult map[string]interface{}
	err = api.UnmarshalJSON(body, &orderResult)
	assert.NoError(t, err)
	
	orderData, ok := orderResult["data"].(map[string]interface{})
	assert.True(t, ok)
	orderID, ok := orderData["id"].(string)
	assert.True(t, ok)
	
	// Test get order by ID
	resp, body, err = api.Request(http.MethodGet, "/orders/"+orderID, nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Test get all user orders
	resp, body, err = api.Request(http.MethodGet, "/orders", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Test invalid checkout (no address)
	invalidCheckoutBody := map[string]interface{}{
		"paymentMethod": "cash_on_delivery",
	}
	resp, _, err = api.Request(http.MethodPost, "/orders/checkout", invalidCheckoutBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	
	// Test checkout with empty cart
	// First clear the cart by removing the item
	resp, _, err = api.Request(http.MethodDelete, "/cart/items/"+productID, nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Now try checkout with empty cart
	resp, _, err = api.Request(http.MethodPost, "/orders/checkout", checkoutBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
} 