//go:build integration

package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
	"sentinelml/ingestion/internal/domain"
	"testing"
	"time"
)

func TestAtomicIdempotentAcceptance(t *testing.T) {
	db, err := gorm.Open(postgres.Open(os.Getenv("TEST_DATABASE_URL")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	tx := db.Begin()
	defer tx.Rollback()
	repo := Repository{DB: tx}
	transaction := domain.Transaction{ID: uuid.NewString(), OrganizationID: uuid.NewString(), IdempotencyKey: uuid.NewString(), PayloadHash: "hash-a", AccountToken: "tok_test", Merchant: "Test Market", Amount: 100, Currency: "USD", Country: "US", DeviceTrust: .9, CreatedAt: time.Now().UTC()}
	duplicate, err := repo.Accept(context.Background(), &transaction, uuid.NewString())
	if err != nil || duplicate {
		t.Fatalf("first acceptance: duplicate=%v err=%v", duplicate, err)
	}
	var events int64
	tx.Model(&domain.Outbox{}).Where("organization_id = ?", transaction.OrganizationID).Count(&events)
	if events != 1 {
		t.Fatalf("want one durable event, got %d", events)
	}
	second := transaction
	second.ID = uuid.NewString()
	duplicate, err = repo.Accept(context.Background(), &second, uuid.NewString())
	if err != nil || !duplicate || second.ID != transaction.ID {
		t.Fatalf("replay did not return original transaction: %v", err)
	}
	second.PayloadHash = "different"
	_, err = repo.Accept(context.Background(), &second, uuid.NewString())
	if err != ErrConflict {
		t.Fatalf("want conflict, got %v", err)
	}
	tx.Model(&domain.Outbox{}).Where("organization_id = ?", transaction.OrganizationID).Count(&events)
	if events != 1 {
		t.Fatal("replay created another outbox event")
	}
	// Separate tenants can reuse the same idempotency key safely.
	other := transaction
	other.ID = uuid.NewString()
	other.OrganizationID = uuid.NewString()
	duplicate, err = repo.Accept(context.Background(), &other, uuid.NewString())
	if err != nil || duplicate {
		t.Fatalf("tenant collision: %v", err)
	}
}
