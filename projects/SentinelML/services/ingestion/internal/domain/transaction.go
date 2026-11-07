package domain

import (
	"errors"
	"math"
	"regexp"
	"time"
)

type Transaction struct {
	ID              string    `json:"id" gorm:"type:uuid;primaryKey"`
	OrganizationID  string    `json:"organization_id" gorm:"type:uuid;not null;uniqueIndex:tenant_key"`
	IdempotencyKey  string    `json:"-" gorm:"not null;uniqueIndex:tenant_key"`
	PayloadHash     string    `json:"-"`
	AccountToken    string    `json:"account_token"`
	Merchant        string    `json:"merchant"`
	Amount          float64   `json:"amount"`
	Currency        string    `json:"currency"`
	Country         string    `json:"country"`
	AccountAgeDays  float64   `json:"account_age_days"`
	VelocityHour    float64   `json:"velocity_hour"`
	DeviceTrust     float64   `json:"device_trust"`
	DistanceKM      float64   `json:"distance_km"`
	FailedAttempts  float64   `json:"failed_attempts"`
	NewDevice       bool      `json:"new_device"`
	CountryMismatch bool      `json:"country_mismatch"`
	CreatedAt       time.Time `json:"created_at"`
}

func (t Transaction) Validate() error {
	if !regexp.MustCompile(`^tok_[A-Za-z0-9_-]{1,124}$`).MatchString(t.AccountToken) || len(t.Merchant) < 2 || len(t.Merchant) > 128 {
		return errors.New("invalid token or merchant; tokenized references must start with tok_")
	}
	if !regexp.MustCompile(`^[A-Z]{3}$`).MatchString(t.Currency) || !regexp.MustCompile(`^[A-Z]{2}$`).MatchString(t.Country) {
		return errors.New("currency must be ISO 4217 and country ISO 3166 alpha-2")
	}
	for _, v := range []float64{t.Amount, t.AccountAgeDays, t.VelocityHour, t.DeviceTrust, t.DistanceKM, t.FailedAttempts} {
		if math.IsNaN(v) || math.IsInf(v, 0) || v < 0 {
			return errors.New("numeric values must be finite and nonnegative")
		}
	}
	if t.Amount <= 0 || t.Amount > 10000000 || t.DeviceTrust > 1 || t.VelocityHour > 100000 || t.FailedAttempts > 10000 || t.AccountAgeDays > 36500 || t.DistanceKM > 41000 {
		return errors.New("numeric value outside permitted range")
	}
	if math.Abs(t.Amount*100-math.Round(t.Amount*100)) > 0.00001 {
		return errors.New("amount supports at most two decimal places")
	}
	return nil
}

type Event struct {
	EventID        string      `json:"event_id"`
	EventType      string      `json:"event_type"`
	SchemaVersion  int         `json:"schema_version"`
	OrganizationID string      `json:"organization_id"`
	TransactionID  string      `json:"transaction_id"`
	CorrelationID  string      `json:"correlation_id"`
	OccurredAt     time.Time   `json:"occurred_at"`
	Payload        Transaction `json:"payload"`
	TraceParent    string      `json:"trace_parent,omitempty"`
}

type APIKey struct {
	ID             string `gorm:"type:uuid;primaryKey"`
	OrganizationID string `gorm:"type:uuid;not null"`
	Digest         string `gorm:"uniqueIndex;not null"`
	Revoked        bool
	Name           string
	Prefix         string
	CreatedAt      time.Time
	RevokedAt      *time.Time
}

type Outbox struct {
	ID             string `gorm:"type:uuid;primaryKey"`
	OrganizationID string `gorm:"type:uuid;not null"`
	Payload        string `gorm:"type:jsonb;not null"`
	Attempts       int
	AvailableAt    time.Time `gorm:"index"`
	PublishedAt    *time.Time
	CreatedAt      time.Time
}
