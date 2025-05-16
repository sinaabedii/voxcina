package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"

	"backEnd/test"
)

func TestRegister(t *testing.T) {
	api := test.NewTestAPI()

	// Test successful registration
	email := "newuser@example.com"
	password := "Password123!@#"
	name := "New User"

	reqBody := map[string]interface{}{
		"email":    email,
		"password": password,
		"name":     name,
	}

	resp, _, err := api.Request(http.MethodPost, "/users/register", reqBody, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	// Test duplicate email
	resp, _, err = api.Request(http.MethodPost, "/users/register", reqBody, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// Test invalid email
	reqBody["email"] = "invalid-email"
	resp, _, err = api.Request(http.MethodPost, "/users/register", reqBody, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// Test short password
	reqBody["email"] = "another@example.com"
	reqBody["password"] = "123"
	resp, _, err = api.Request(http.MethodPost, "/users/register", reqBody, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestLogin(t *testing.T) {
	api := test.NewTestAPI()

	// Test successful login
	reqBody := map[string]interface{}{
		"email":    "test@example.com",
		"password": "Test123!@#",
	}

	resp, _, err := api.Request(http.MethodPost, "/users/login", reqBody, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test wrong password
	reqBody["password"] = "wrongpassword"
	resp, _, err = api.Request(http.MethodPost, "/users/login", reqBody, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	// Test non-existent user
	reqBody["email"] = "nonexistent@example.com"
	reqBody["password"] = "Test123!@#"
	resp, _, err = api.Request(http.MethodPost, "/users/login", reqBody, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestLogout(t *testing.T) {
	api := test.NewTestAPI()

	// Login first to get a token
	token, err := api.Login("test@example.com", "Test123!@#")
	assert.NoError(t, err)

	// Test successful logout
	resp, _, err := api.Request(http.MethodPost, "/users/logout", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test logout with invalid token
	resp, _, err = api.Request(http.MethodPost, "/users/logout", nil, "invalid-token")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestAuthMiddleware(t *testing.T) {
	api := test.NewTestAPI()

	// Test accessing protected endpoint without token
	resp, _, err := api.Request(http.MethodGet, "/users/profile", nil, "")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	// Test with valid token
	token, err := api.Login("test@example.com", "Test123!@#")
	assert.NoError(t, err)

	resp, _, err = api.Request(http.MethodGet, "/users/profile", nil, token)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Test with invalid token
	resp, _, err = api.Request(http.MethodGet, "/users/profile", nil, "invalid-token")
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}
