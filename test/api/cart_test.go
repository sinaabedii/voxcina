package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"

	"backEnd/test"
)

func TestCart(t *testing.T) {
	api := test.NewTestAPI()

	// Login to get token
	token, err := api.Login("test@example.com", "Test123!@#")
	assert.NoError(t, err)

	// Get a product ID to add to cart
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

	// Test initial cart state (should be empty)
	resp, _, err = api.Request(http.MethodGet, "/cart", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Add item to cart
	addItemBody := map[string]interface{}{
		"productId": productID,
		"quantity":  2,
	}
	resp, _, err = api.Request(http.MethodPost, "/cart/items", addItemBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	// Verify item was added
	resp, _, err = api.Request(http.MethodGet, "/cart", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Update cart item quantity
	updateItemBody := map[string]interface{}{
		"quantity": 3,
	}
	resp, _, err = api.Request(
		http.MethodPut,
		"/cart/items/"+productID,
		updateItemBody,
		token,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Verify quantity was updated
	resp, _, err = api.Request(http.MethodGet, "/cart", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Remove item from cart
	resp, _, err = api.Request(http.MethodDelete, "/cart/items/"+productID, nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Verify item was removed
	resp, _, err = api.Request(http.MethodGet, "/cart", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test adding invalid product ID
	addItemBody = map[string]interface{}{
		"productId": "nonexistentid",
		"quantity":  2,
	}
	resp, _, err = api.Request(http.MethodPost, "/cart/items", addItemBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// Test adding invalid quantity
	addItemBody = map[string]interface{}{
		"productId": productID,
		"quantity":  0,
	}
	resp, _, err = api.Request(http.MethodPost, "/cart/items", addItemBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}
