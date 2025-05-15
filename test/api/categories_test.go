package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"

	"backEnd/test"
)

func TestGetCategories(t *testing.T) {
	api := test.NewTestAPI()

	// Test get all categories
	resp, body, err := api.Request(http.MethodGet, "/categories", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Parse response to check structure
	var result map[string]interface{}
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)
	assert.Contains(t, result, "data")
}

func TestGetCategoryByID(t *testing.T) {
	api := test.NewTestAPI()

	// First get a category ID from the list
	resp, body, err := api.Request(http.MethodGet, "/categories", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var result map[string]interface{}
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)

	data, ok := result["data"].([]interface{})
	if !assert.True(t, ok) || !assert.NotEmpty(t, data) {
		t.FailNow()
	}

	category := data[0].(map[string]interface{})
	categoryID := category["id"].(string)

	// Now get the category by ID
	resp, _, err = api.Request(http.MethodGet, "/categories/"+categoryID, nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test non-existent category
	resp, _, err = api.Request(http.MethodGet, "/categories/nonexistentid", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestGetCategoryProducts(t *testing.T) {
	api := test.NewTestAPI()

	// First get a category ID from the list
	resp, body, err := api.Request(http.MethodGet, "/categories", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var result map[string]any
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)

	data, ok := result["data"].([]any)
	if !assert.True(t, ok) || !assert.NotEmpty(t, data) {
		t.FailNow()
	}

	category := data[0].(map[string]any)
	categoryID := category["id"].(string)

	// Get products for this category
	resp, body, err = api.Request(
		http.MethodGet,
		"/categories/"+categoryID+"/products",
		nil,
		"",
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Parse response to check structure
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)
	assert.Contains(t, result, "data")
	assert.Contains(t, result, "pagination")

	// Test pagination
	resp, _, err = api.Request(
		http.MethodGet,
		"/categories/"+categoryID+"/products?page=1&limit=5",
		nil,
		"",
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}
