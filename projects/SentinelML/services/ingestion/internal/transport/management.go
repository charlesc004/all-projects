package transport

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"sentinelml/ingestion/internal/domain"
)

func serviceAuthorized(r *http.Request) bool {
	expected := os.Getenv("INTERNAL_SERVICE_TOKEN")
	supplied := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	a, b := sha256.Sum256([]byte(expected)), sha256.Sum256([]byte(supplied))
	return len(expected) >= 32 && subtle.ConstantTimeCompare(a[:], b[:]) == 1
}

func (h Handler) Retention(w http.ResponseWriter, r *http.Request) {
	if !serviceAuthorized(r) {
		respond(w, 401, map[string]string{"error": "invalid service credential"})
		return
	}
	org := chi.URLParam(r, "organization_id")
	if _, err := uuid.Parse(org); err != nil {
		respond(w, 422, map[string]string{"error": "invalid organization"})
		return
	}
	var input struct {
		Before         time.Time `json:"before"`
		TransactionIDs []string  `json:"transaction_ids"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16384))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&input) != nil || decoder.Decode(&struct{}{}) != io.EOF || len(input.TransactionIDs) == 0 || len(input.TransactionIDs) > 200 || input.Before.After(time.Now().UTC().Add(-7*24*time.Hour)) {
		respond(w, 422, map[string]string{"error": "retention requires 1-200 transaction UUIDs and a cutoff at least seven days old"})
		return
	}
	for _, id := range input.TransactionIDs {
		if _, err := uuid.Parse(id); err != nil {
			respond(w, 422, map[string]string{"error": "invalid transaction UUID"})
			return
		}
	}
	var deleted int64
	err := h.Repo.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var pending int64
		if err := tx.Model(&domain.Outbox{}).Where("organization_id = ? AND payload->>'transaction_id' IN ? AND published_at IS NULL", org, input.TransactionIDs).Count(&pending).Error; err != nil {
			return err
		}
		if pending > 0 {
			return gorm.ErrInvalidTransaction
		}
		result := tx.Where("organization_id = ? AND id IN ? AND created_at < ?", org, input.TransactionIDs, input.Before).Delete(&domain.Transaction{})
		deleted = result.RowsAffected
		if result.Error != nil {
			return result.Error
		}
		return tx.Where("organization_id = ? AND payload->>'transaction_id' IN ? AND published_at IS NOT NULL AND created_at < ?", org, input.TransactionIDs, input.Before).Delete(&domain.Outbox{}).Error
	})
	if err != nil {
		respond(w, 409, map[string]string{"error": "retention held because records are pending or storage is unavailable"})
		return
	}
	respond(w, 200, map[string]int64{"deleted": deleted})
}

// Management is internal-only. The control plane supplies tenant identity after RBAC.
func (h Handler) Management(w http.ResponseWriter, r *http.Request) {
	expected := os.Getenv("INTERNAL_SERVICE_TOKEN")
	supplied := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	a, b := sha256.Sum256([]byte(expected)), sha256.Sum256([]byte(supplied))
	if len(expected) < 32 || subtle.ConstantTimeCompare(a[:], b[:]) != 1 {
		respond(w, 401, map[string]string{"error": "invalid service credential"})
		return
	}
	org := chi.URLParam(r, "organization_id")
	if _, err := uuid.Parse(org); err != nil {
		respond(w, 422, map[string]string{"error": "invalid organization"})
		return
	}
	if r.Method == http.MethodGet {
		var keys []domain.APIKey
		if err := h.Repo.DB.WithContext(r.Context()).Where("organization_id = ?", org).Order("created_at DESC").Limit(100).Find(&keys).Error; err != nil {
			respond(w, 503, map[string]string{"error": "credential storage unavailable"})
			return
		}
		items := make([]map[string]any, 0, len(keys))
		for _, key := range keys {
			items = append(items, map[string]any{"id": key.ID, "name": key.Name, "prefix": key.Prefix, "revoked": key.Revoked, "created_at": key.CreatedAt, "revoked_at": key.RevokedAt})
		}
		respond(w, 200, map[string]any{"items": items})
		return
	}
	if r.Method == http.MethodPatch {
		result := h.Repo.DB.WithContext(r.Context()).Model(&domain.APIKey{}).Where("id = ? AND organization_id = ? AND prefix <> ?", chi.URLParam(r, "id"), org, "synthetic-demo").Updates(map[string]any{"revoked": true, "revoked_at": time.Now().UTC()})
		if result.Error != nil {
			respond(w, 503, map[string]string{"error": "credential storage unavailable"})
			return
		}
		if result.RowsAffected == 0 {
			respond(w, 404, map[string]string{"error": "credential not found"})
			return
		}
		respond(w, 200, map[string]bool{"revoked": true})
		return
	}
	var input struct {
		Name     string `json:"name"`
		RotateID string `json:"rotate_id"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&input) != nil || decoder.Decode(&struct{}{}) != io.EOF || len(input.Name) < 3 || len(input.Name) > 100 {
		respond(w, 422, map[string]string{"error": "name of 3-100 characters required"})
		return
	}
	if input.RotateID != "" {
		if _, err := uuid.Parse(input.RotateID); err != nil {
			respond(w, 422, map[string]string{"error": "rotation target must be a UUID"})
			return
		}
	}
	random := make([]byte, 32)
	if _, err := rand.Read(random); err != nil {
		respond(w, 503, map[string]string{"error": "secure random source unavailable"})
		return
	}
	raw := "sentinel_sk_" + hex.EncodeToString(random)
	digest := sha256.Sum256([]byte(raw))
	key := domain.APIKey{ID: uuid.NewString(), OrganizationID: org, Digest: hex.EncodeToString(digest[:]), Name: input.Name, Prefix: raw[:19], CreatedAt: time.Now().UTC()}
	err := h.Repo.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if input.RotateID != "" {
			result := tx.Model(&domain.APIKey{}).Where("id = ? AND organization_id = ? AND revoked = false AND prefix <> ?", input.RotateID, org, "synthetic-demo").Updates(map[string]any{"revoked": true, "revoked_at": time.Now().UTC()})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return gorm.ErrRecordNotFound
			}
		}
		return tx.Create(&key).Error
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			respond(w, 404, map[string]string{"error": "active rotation target not found"})
		} else {
			respond(w, 503, map[string]string{"error": "credential transaction failed"})
		}
		return
	}
	respond(w, 201, map[string]any{"id": key.ID, "name": key.Name, "prefix": key.Prefix, "credential": raw, "created_at": key.CreatedAt})
}
