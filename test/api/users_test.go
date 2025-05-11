package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"voxcina/test"
)

func TestGetProfile(t *testing.T) {
	api := test.NewTestAPI()
	
	// Login to get token
	token, err := api.Login("test@example.com", "test123")
	assert.NoError(t, err)
	
	// Test get profile
	resp, body, err := api.Request(http.MethodGet, "/users/profile", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestUpdateProfile(t *testing.T) {
	api := test.NewTestAPI()
	
	// Login to get token
	token, err := api.Login("test@example.com", "test123")
	assert.NoError(t, err)
	
	// Test update profile
	updateBody := map[string]interface{}{
		"name": "Updated Name",
	}
	resp, _, err := api.Request(http.MethodPut, "/users/profile", updateBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Verify profile was updated
	resp, body, err := api.Request(http.MethodGet, "/users/profile", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestAddAddress(t *testing.T) {
	api := test.NewTestAPI()
	
	// Login to get token
	token, err := api.Login("test@example.com", "test123")
	assert.NoError(t, err)
	
	// Test add address
	addressBody := map[string]interface{}{
		"street":  "123 Test St",
		"city":    "Test City",
		"state":   "Test State",
		"country": "Test Country",
		"zipCode": "12345",
		"isDefault": true,
	}
	resp, body, err := api.Request(http.MethodPost, "/users/addresses", addressBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	
	// Test adding invalid address (missing required field)
	invalidAddress := map[string]interface{}{
		"street": "123 Test St",
		"city":   "Test City",
		// Missing state, country, zipCode
	}
	resp, _, err = api.Request(http.MethodPost, "/users/addresses", invalidAddress, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestUpdateAddress(t *testing.T) {
	api := test.NewTestAPI()
	
	// Login to get token
	token, err := api.Login("test@example.com", "test123")
	assert.NoError(t, err)
	
	// First add an address
	addressBody := map[string]interface{}{
		"street":  "123 Test St",
		"city":    "Test City",
		"state":   "Test State",
		"country": "Test Country",
		"zipCode": "12345",
		"isDefault": true,
	}
	resp, body, err := api.Request(http.MethodPost, "/users/addresses", addressBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	
	// Get the address ID from the response
	var result map[string]interface{}
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)
	
	addressData, ok := result["data"].(map[string]interface{})
	assert.True(t, ok)
	addressID, ok := addressData["id"].(string)
	assert.True(t, ok)
	
	// Update the address
	updateBody := map[string]interface{}{
		"street":  "456 Updated St",
		"city":    "Updated City",
		"state":   "Updated State",
		"country": "Updated Country",
		"zipCode": "54321",
		"isDefault": true,
	}
	resp, _, err = api.Request(http.MethodPut, "/users/addresses/"+addressID, updateBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestDeleteAddress(t *testing.T) {
	api := test.NewTestAPI()
	
	// Login to get token
	token, err := api.Login("test@example.com", "test123")
	assert.NoError(t, err)
	
	// First add an address
	addressBody := map[string]interface{}{
		"street":  "123 Test St",
		"city":    "Test City",
		"state":   "Test State",
		"country": "Test Country",
		"zipCode": "12345",
		"isDefault": false, // Not default so we can delete it
	}
	resp, body, err := api.Request(http.MethodPost, "/users/addresses", addressBody, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	
	// Get the address ID from the response
	var result map[string]interface{}
	err = api.UnmarshalJSON(body, &result)
	assert.NoError(t, err)
	
	addressData, ok := result["data"].(map[string]interface{})
	assert.True(t, ok)
	addressID, ok := addressData["id"].(string)
	assert.True(t, ok)
	
	// Delete the address
	resp, _, err = api.Request(http.MethodDelete, "/users/addresses/"+addressID, nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Verify address was deleted
	resp, _, err = api.Request(http.MethodGet, "/users/addresses/"+addressID, nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
} 