package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
)

const neshanAPIBase = "https://api.neshan.org/v1"

type NeshanReverseResult struct {
	Status          string `json:"status"`
	FormattedAddress string `json:"formatted_address"`
	Address         string `json:"address"`
	Neighbourhood   string `json:"neighbourhood"`
	City            string `json:"city"`
	State           string `json:"state"`
	ErrorMessage    string `json:"error_message"`
}

type NeshanSearchResult struct {
	Status       string             `json:"status"`
	Items        []NeshanSearchItem `json:"items"`
	ErrorMessage string             `json:"error_message"`
}

type NeshanSearchItem struct {
	Title    string `json:"title"`
	Address  string `json:"address"`
	Location struct {
		X float64 `json:"x"`
		Y float64 `json:"y"`
	} `json:"location"`
}

func ReverseGeocode(lat, lng float64) (*NeshanReverseResult, error) {
	apiKey := os.Getenv("NESHAN_SERVICE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("NESHAN_SERVICE_API_KEY is not set")
	}

	reqURL := fmt.Sprintf("%s/reverse?lat=%f&lng=%f", neshanAPIBase, lat, lng)
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Api-Key", apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result NeshanReverseResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if result.Status != "OK" {
		return nil, fmt.Errorf("neshan reverse geocode failed (status=%s, body=%s)", result.Status, string(body))
	}

	return &result, nil
}

func SearchAddress(term string, lat, lng float64) ([]NeshanSearchItem, error) {
	apiKey := os.Getenv("NESHAN_SERVICE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("NESHAN_SERVICE_API_KEY is not set")
	}

	reqURL := fmt.Sprintf("%s/search?%s", neshanAPIBase, url.Values{
		"term": {term},
		"lat":  {fmt.Sprintf("%f", lat)},
		"lng":  {fmt.Sprintf("%f", lng)},
	}.Encode())

	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Api-Key", apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result NeshanSearchResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if result.Status != "OK" {
		return nil, fmt.Errorf("neshan search failed (status=%s, body=%s)", result.Status, string(body))
	}

	if result.Items == nil {
		result.Items = []NeshanSearchItem{}
	}

	return result.Items, nil
}
