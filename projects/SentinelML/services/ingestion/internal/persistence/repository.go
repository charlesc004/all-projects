package persistence

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"sentinelml/ingestion/internal/domain"
	"time"
)

var ErrConflict = errors.New("idempotency key was used with a different payload")

type Repository struct{ DB *gorm.DB }

func (r Repository) Accept(ctx context.Context, t *domain.Transaction, correlation string) (bool, error) {
	duplicate := false
	err := r.DB.WithContext(ctx).Transaction(func(db *gorm.DB) error {
		result := db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "organization_id"}, {Name: "idempotency_key"}}, DoNothing: true}).Create(t)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			var prior domain.Transaction
			if err := db.Where("organization_id = ? AND idempotency_key = ?", t.OrganizationID, t.IdempotencyKey).First(&prior).Error; err != nil {
				return err
			}
			if prior.PayloadHash != t.PayloadHash {
				return ErrConflict
			}
			*t = prior
			duplicate = true
			return nil
		}
		e := domain.Event{EventID: uuid.NewString(), EventType: "transaction.received.v1", SchemaVersion: 1, OrganizationID: t.OrganizationID, TransactionID: t.ID, CorrelationID: correlation, OccurredAt: time.Now().UTC(), Payload: *t}
		carrier := propagation.MapCarrier{}
		otel.GetTextMapPropagator().Inject(ctx, carrier)
		e.TraceParent = carrier.Get("traceparent")
		payload, err := json.Marshal(e)
		if err != nil {
			return err
		}
		return db.Create(&domain.Outbox{ID: e.EventID, OrganizationID: t.OrganizationID, Payload: string(payload), AvailableAt: time.Now().UTC()}).Error
	})
	return duplicate, err
}
