//go:build integration

package transport

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"sentinelml/ingestion/internal/domain"
	"sentinelml/ingestion/internal/persistence"
)

func TestAuthenticatedDurableAPI(t *testing.T) {
	db, err := gorm.Open(postgres.Open(os.Getenv("TEST_DATABASE_URL")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	tx := db.Begin()
	defer tx.Rollback()
	cache := redis.NewClient(&redis.Options{Addr: os.Getenv("TEST_REDIS_ADDR")})
	defer cache.Close()
	if err := cache.Ping(context.Background()).Err(); err != nil {
		t.Fatal(err)
	}
	secret := uuid.NewString()
	digest := sha256.Sum256([]byte(secret))
	key := domain.APIKey{ID: uuid.NewString(), OrganizationID: uuid.NewString(), Digest: hex.EncodeToString(digest[:])}
	if err := tx.Create(&key).Error; err != nil {
		t.Fatal(err)
	}
	handler := Handler{Repo: persistence.Repository{DB: tx}, Redis: cache}
	router := chi.NewRouter()
	router.Post("/v1/transactions", handler.API)
	router.Get("/v1/transactions/{id}", handler.API)
	send := func(method, path, token, idempotency, body string) *httptest.ResponseRecorder {
		request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
		request.Header.Set("Authorization", "Bearer "+token)
		request.Header.Set("Idempotency-Key", idempotency)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		return response
	}
	body := `{"account_token":"tok_test_001","merchant":"Test Market","amount":125,"currency":"USD","country":"US","account_age_days":300,"velocity_hour":1,"device_trust":0.9,"distance_km":3,"failed_attempts":0,"new_device":false,"country_mismatch":false}`
	if got := send("POST", "/v1/transactions", "wrong-key", "test-request-001", body).Code; got != http.StatusUnauthorized {
		t.Fatalf("invalid key: got %d", got)
	}
	if got := send("POST", "/v1/transactions", secret, "", body).Code; got != http.StatusBadRequest {
		t.Fatalf("missing idempotency key: got %d", got)
	}
	accepted := send("POST", "/v1/transactions", secret, "test-request-001", body)
	if accepted.Code != http.StatusAccepted {
		t.Fatalf("acceptance: %d %s", accepted.Code, accepted.Body.String())
	}
	var result struct {
		TransactionID string `json:"transaction_id"`
		Duplicate     bool   `json:"duplicate"`
	}
	if err := json.Unmarshal(accepted.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	replay := send("POST", "/v1/transactions", secret, "test-request-001", body)
	var duplicate struct {
		TransactionID string `json:"transaction_id"`
		Duplicate     bool   `json:"duplicate"`
	}
	_ = json.Unmarshal(replay.Body.Bytes(), &duplicate)
	if replay.Code != 202 || !duplicate.Duplicate || duplicate.TransactionID != result.TransactionID {
		t.Fatal("replay did not return the original accepted transaction")
	}
	changed := bytes.ReplaceAll([]byte(body), []byte(`"amount":125`), []byte(`"amount":126`))
	if got := send("POST", "/v1/transactions", secret, "test-request-001", string(changed)).Code; got != http.StatusConflict {
		t.Fatalf("conflicting replay: got %d", got)
	}
	sensitive := body[:len(body)-1] + `,"cvv":"123"}`
	if got := send("POST", "/v1/transactions", secret, "test-request-002", sensitive).Code; got != 400 {
		t.Fatalf("accepted undeclared credential field: %d", got)
	}
	if got := send("GET", "/v1/transactions/"+result.TransactionID, secret, "", "").Code; got != 200 {
		t.Fatalf("owner lookup: %d", got)
	}
	otherSecret := uuid.NewString()
	otherDigest := sha256.Sum256([]byte(otherSecret))
	other := domain.APIKey{ID: uuid.NewString(), OrganizationID: uuid.NewString(), Digest: hex.EncodeToString(otherDigest[:])}
	if err := tx.Create(&other).Error; err != nil {
		t.Fatal(err)
	}
	if got := send("GET", "/v1/transactions/"+result.TransactionID, otherSecret, "", "").Code; got != 404 {
		t.Fatalf("tenant data leaked: %d", got)
	}
	var count int64
	tx.Model(&domain.Outbox{}).Where("organization_id = ?", key.OrganizationID).Count(&count)
	if count != 1 {
		t.Fatalf("want one outbox event, got %d", count)
	}
	rateKey := "limit:" + key.ID + ":" + time.Now().UTC().Format("200601021504")
	if err := cache.Set(context.Background(), rateKey, 600, time.Minute).Err(); err != nil {
		t.Fatal(err)
	}
	defer cache.Del(context.Background(), rateKey)
	limited := send("POST", "/v1/transactions", secret, "test-request-003", body)
	if limited.Code != 429 || limited.Header().Get("Retry-After") == "" {
		t.Fatal("rate limit not enforced")
	}
}
