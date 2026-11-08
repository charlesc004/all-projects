package domain

import (
	"encoding/json"
	"os"
	"testing"
)

func TestSharedEventContract(t *testing.T) {
	bytes, err := os.ReadFile("../../../../contracts/fixtures/transaction.received.v1.json")
	if err != nil {
		t.Fatal(err)
	}
	var event Event
	if err := json.Unmarshal(bytes, &event); err != nil {
		t.Fatal(err)
	}
	if event.EventType != "transaction.received.v1" || event.SchemaVersion != 1 || event.OrganizationID != event.Payload.OrganizationID || event.TransactionID != event.Payload.ID {
		t.Fatal("incompatible event envelope")
	}
	if err := event.Payload.Validate(); err != nil {
		t.Fatal(err)
	}
	// Verify the producer's field set against the strict shared payload schema.
	schemaBytes, err := os.ReadFile("../../../../contracts/events/transaction.received.v1.json")
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties struct {
			Payload struct {
				Required []string `json:"required"`
			} `json:"payload"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(schemaBytes, &schema); err != nil {
		t.Fatal(err)
	}
	encoded, _ := json.Marshal(event.Payload)
	var payload map[string]any
	_ = json.Unmarshal(encoded, &payload)
	for _, field := range schema.Properties.Payload.Required {
		if _, ok := payload[field]; !ok {
			t.Fatalf("missing contract field %s", field)
		}
	}
	if len(payload) != len(schema.Properties.Payload.Required) {
		t.Fatal("producer exposes undeclared fields")
	}
}
