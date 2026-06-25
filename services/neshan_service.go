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
	Neighbourhood     string `json:"neighbourhood"`
	MunicipalityZone  string `json:"municipality_zone"`
	Address           string `json:"address"`
	City              string `json:"city"`
	State             string `json:"state"`
	FormattedAddress  string `json:"formatted_address"`
}

type NeshanSearchResult struct {
	Items        []NeshanSearchItem `json:"items"`
	ErrorMessage string             `json:"error_message"`
	Status       string             `json:"status"`
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

	parts := []string{}
	if result.State != "" {
		parts = append(parts, result.State)
	}
	if result.City != "" {
		parts = append(parts, result.City)
	}
	if result.Address != "" {
		parts = append(parts, result.Address)
	} else if result.Neighbourhood != "" {
		parts = append(parts, result.Neighbourhood)
	}

	if len(parts) == 0 {
		return nil, fmt.Errorf("neshan reverse geocode returned empty response: %s", string(body))
	}

	if result.FormattedAddress == "" {
		result.FormattedAddress = parts[0]
		for i := 1; i < len(parts); i++ {
			result.FormattedAddress += "، " + parts[i]
		}
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

	if result.Status != "OK" && len(result.Items) == 0 {
		return nil, fmt.Errorf("neshan search failed: %s (body=%s)", result.ErrorMessage, string(body))
	}

	if result.Items == nil {
		result.Items = []NeshanSearchItem{}
	}

	return result.Items, nil
}

type NeshanGeocodeResult struct {
	Location struct {
		X float64 `json:"x"`
		Y float64 `json:"y"`
	} `json:"location"`
	Status string `json:"status"`
}

func GeocodeAddress(address string) (*NeshanGeocodeResult, error) {
	apiKey := os.Getenv("NESHAN_SERVICE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("NESHAN_SERVICE_API_KEY is not set")
	}

	reqURL := fmt.Sprintf("https://api.neshan.org/v4/geocoding?%s", url.Values{
		"address": {address},
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

	var result NeshanGeocodeResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if result.Status != "OK" {
		return nil, fmt.Errorf("neshan geocode failed: status=%s body=%s", result.Status, string(body))
	}

	return &result, nil
}
