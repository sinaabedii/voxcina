package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"voxcina/test"
)

func TestGetProducts(t *testing.T) {
	api := test.NewTestAPI()
	
	// Test get all products
	resp, body, err := api.Request(http.MethodGet, "/products", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Parse response to check structure
	var result map[string]interface{}
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)
	assert.Contains(t, result, "data")
	assert.Contains(t, result, "pagination")
	
	// Test pagination
	resp, body, err = api.Request(http.MethodGet, "/products?page=1&limit=5", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Test invalid pagination
	resp, _, err = api.Request(http.MethodGet, "/products?page=-1", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestGetProductByID(t *testing.T) {
	api := test.NewTestAPI()
	
	// First get a product ID from the list
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
	
	// Now get the product by ID
	resp, body, err = api.Request(http.MethodGet, "/products/"+productID, nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Test non-existent product
	resp, _, err = api.Request(http.MethodGet, "/products/nonexistentid", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestSearchProducts(t *testing.T) {
	api := test.NewTestAPI()
	
	// Test search by query
	resp, body, err := api.Request(http.MethodGet, "/products/search?q=test", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Test search with min/max price
	resp, body, err = api.Request(http.MethodGet, "/products/search?minPrice=10&maxPrice=100", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Test search with invalid price range
	resp, _, err = api.Request(http.MethodGet, "/products/search?minPrice=100&maxPrice=10", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
} 