package transport

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"io"
	"net/http"
	"sentinelml/ingestion/internal/domain"
	"sentinelml/ingestion/internal/persistence"
	"strings"
	"time"
)

var received = promauto.NewCounter(prometheus.CounterOpts{Name: "sentinel_transactions_received_total", Help: "Durably accepted transactions"})
var invalid = promauto.NewCounter(prometheus.CounterOpts{Name: "sentinel_validation_failures_total", Help: "Invalid ingestion requests"})

type Handler struct {
	Repo  persistence.Repository
	Redis *redis.Client
}

func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func (h Handler) API(w http.ResponseWriter, r *http.Request) {
	digest := sha256.Sum256([]byte(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")))
	var key domain.APIKey
	if err := h.Repo.DB.Where("digest = ? AND revoked = false", hex.EncodeToString(digest[:])).First(&key).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respond(w, 401, map[string]string{"error": "invalid API key"})
		} else {
			respond(w, 503, map[string]string{"error": "authentication storage unavailable"})
		}
		return
	}
	minute := time.Now().UTC().Format("200601021504")
	n, err := h.Redis.Eval(r.Context(), `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],65) end; return n`, []string{"limit:" + key.ID + ":" + minute}).Int()
	if err != nil {
		respond(w, 503, map[string]string{"error": "rate limiter unavailable"})
		return
	}
	if n > 600 {
		w.Header().Set("Retry-After", "60")
		respond(w, 429, map[string]string{"error": "rate limit exceeded"})
		return
	}
	if r.Method == "GET" {
		if strings.HasSuffix(r.URL.Path, "stats") {
			var count int64
			if err := h.Repo.DB.Model(&domain.Transaction{}).Where("organization_id = ?", key.OrganizationID).Count(&count).Error; err != nil {
				respond(w, 503, map[string]string{"error": "statistics unavailable"})
				return
			}
			respond(w, 200, map[string]int64{"accepted": count})
			return
		}
		var t domain.Transaction
		if err := h.Repo.DB.Where("id = ? AND organization_id = ?", chi.URLParam(r, "id"), key.OrganizationID).First(&t).Error; err != nil {
			respond(w, 404, map[string]string{"error": "transaction not found"})
			return
		}
		respond(w, 200, transactionDTO(t))
		return
	}
	idempotency := r.Header.Get("Idempotency-Key")
	if len(idempotency) < 8 || len(idempotency) > 128 {
		respond(w, 400, map[string]string{"error": "Idempotency-Key of 8-128 characters required"})
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 16384)
	// Decode into an input-only shape: clients cannot set ownership or identifiers.
	var input struct {
		AccountToken    string  `json:"account_token"`
		Merchant        string  `json:"merchant"`
		Amount          float64 `json:"amount"`
		Currency        string  `json:"currency"`
		Country         string  `json:"country"`
		AccountAgeDays  float64 `json:"account_age_days"`
		VelocityHour    float64 `json:"velocity_hour"`
		DeviceTrust     float64 `json:"device_trust"`
		DistanceKM      float64 `json:"distance_km"`
		FailedAttempts  float64 `json:"failed_attempts"`
		NewDevice       bool    `json:"new_device"`
		CountryMismatch bool    `json:"country_mismatch"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		invalid.Inc()
		respond(w, 400, map[string]string{"error": "invalid transaction payload; unknown fields are rejected"})
		return
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		respond(w, 400, map[string]string{"error": "one JSON object required"})
		return
	}
	t := domain.Transaction{AccountToken: input.AccountToken, Merchant: input.Merchant, Amount: input.Amount, Currency: strings.ToUpper(input.Currency), Country: strings.ToUpper(input.Country), AccountAgeDays: input.AccountAgeDays, VelocityHour: input.VelocityHour, DeviceTrust: input.DeviceTrust, DistanceKM: input.DistanceKM, FailedAttempts: input.FailedAttempts, NewDevice: input.NewDevice, CountryMismatch: input.CountryMismatch}
	if err := t.Validate(); err != nil {
		invalid.Inc()
		respond(w, 422, map[string]string{"error": err.Error()})
		return
	}
	encoded, _ := json.Marshal(t)
	sum := sha256.Sum256(encoded)
	t.PayloadHash = hex.EncodeToString(sum[:])
	t.ID = uuid.NewString()
	t.OrganizationID = key.OrganizationID
	t.IdempotencyKey = idempotency
	t.CreatedAt = time.Now().UTC()
	correlation := r.Header.Get("X-Correlation-ID")
	if _, err := uuid.Parse(correlation); err != nil {
		correlation = uuid.NewString()
	}
	w.Header().Set("X-Correlation-ID", correlation)
	duplicate, err := h.Repo.Accept(r.Context(), &t, correlation)
	if errors.Is(err, persistence.ErrConflict) {
		respond(w, 409, map[string]string{"error": err.Error()})
		return
	}
	if err != nil {
		respond(w, 503, map[string]string{"error": "unable to durably queue transaction"})
		return
	}
	if !duplicate {
		received.Inc()
	}
	respond(w, 202, map[string]any{"transaction_id": t.ID, "status": "accepted", "duplicate": duplicate, "correlation_id": correlation})
}

func transactionDTO(t domain.Transaction) map[string]any {
	return map[string]any{"id": t.ID, "organization_id": t.OrganizationID, "account_token": t.AccountToken, "merchant": t.Merchant, "amount": t.Amount, "currency": t.Currency, "country": t.Country, "account_age_days": t.AccountAgeDays, "velocity_hour": t.VelocityHour, "device_trust": t.DeviceTrust, "distance_km": t.DistanceKM, "failed_attempts": t.FailedAttempts, "new_device": t.NewDevice, "country_mismatch": t.CountryMismatch, "created_at": t.CreatedAt}
}
