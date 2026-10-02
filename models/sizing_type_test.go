package models

import (
	"encoding/json"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestSizingTypeGuidanceFieldsPreserveJSONAndBSONNames(t *testing.T) {
	sizingType := SizingType{
		AdminMeasurementGuide: "لباس را بدون کشش روی سطح صاف قرار دهید.",
		ImagePrompt:           "vector prompt",
		ImagePromptMannequin:  "mannequin prompt",
		Measurements: []SizingMeasurementDef{{
			Key:                "chest_width",
			Label:              "عرض سینه",
			GarmentMeasurement: "از زیر حلقه تا زیر حلقه اندازه بگیرید.",
		}},
	}

	jsonData, err := json.Marshal(sizingType)
	if err != nil {
		t.Fatalf("marshal JSON failed: %v", err)
	}
	var jsonFields map[string]interface{}
	if err := json.Unmarshal(jsonData, &jsonFields); err != nil {
		t.Fatalf("unmarshal JSON failed: %v", err)
	}
	if jsonFields["image_prompt_mannequin"] != sizingType.ImagePromptMannequin {
		t.Errorf("image_prompt_mannequin JSON field mismatch: %v", jsonFields["image_prompt_mannequin"])
	}
	if jsonFields["image_prompt"] != sizingType.ImagePrompt {
		t.Errorf("image_prompt JSON field mismatch: %v", jsonFields["image_prompt"])
	}
	if jsonFields["admin_measurement_guide"] != sizingType.AdminMeasurementGuide {
		t.Errorf("admin guidance JSON field mismatch: %v", jsonFields["admin_measurement_guide"])
	}
	measurements, ok := jsonFields["measurements"].([]interface{})
	if !ok || len(measurements) != 1 {
		t.Fatalf("expected one JSON measurement, got %v", jsonFields["measurements"])
	}
	measurement, ok := measurements[0].(map[string]interface{})
	if !ok || measurement["garment_measurement"] != sizingType.Measurements[0].GarmentMeasurement {
		t.Errorf("garment measurement JSON field mismatch: %v", measurements[0])
	}

	bsonData, err := bson.Marshal(sizingType)
	if err != nil {
		t.Fatalf("marshal BSON failed: %v", err)
	}
	var bsonFields bson.M
	if err := bson.Unmarshal(bsonData, &bsonFields); err != nil {
		t.Fatalf("unmarshal BSON failed: %v", err)
	}
	if bsonFields["image_prompt_mannequin"] != sizingType.ImagePromptMannequin {
		t.Errorf("image_prompt_mannequin BSON field mismatch: %v", bsonFields["image_prompt_mannequin"])
	}
	if bsonFields["image_prompt"] != sizingType.ImagePrompt {
		t.Errorf("image_prompt BSON field mismatch: %v", bsonFields["image_prompt"])
	}
	if bsonFields["admin_measurement_guide"] != sizingType.AdminMeasurementGuide {
		t.Errorf("admin guidance BSON field mismatch: %v", bsonFields["admin_measurement_guide"])
	}
	bsonMeasurements, ok := bsonFields["measurements"].(primitive.A)
	if !ok || len(bsonMeasurements) != 1 {
		t.Fatalf("expected one BSON measurement, got %v", bsonFields["measurements"])
	}
	bsonMeasurement, ok := bsonMeasurements[0].(bson.M)
	if !ok || bsonMeasurement["garment_measurement"] != sizingType.Measurements[0].GarmentMeasurement {
		t.Errorf("garment measurement BSON field mismatch: %v", bsonMeasurements[0])
	}
}
