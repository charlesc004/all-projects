package main

import (
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/twmb/franz-go/pkg/kgo"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
	"net/http"
	"os"
	"os/signal"
	"sentinelml/ingestion/internal/domain"
	"sentinelml/ingestion/internal/observability"
	"sentinelml/ingestion/internal/persistence"
	"sentinelml/ingestion/internal/transport"
	"strings"
	"syscall"
	"time"
)

//go:embed migrations/*.sql
var migrations embed.FS

func main() {
	zerolog.TimestampFunc = func() time.Time { return time.Now().UTC() }
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	db, err := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		log.Fatal().Err(err).Msg("database connection")
	}
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		migrate(db)
		return
	}
	redisClient := redis.NewClient(&redis.Options{Addr: os.Getenv("REDIS_ADDR")})
	shutdownTelemetry, err := observability.Setup()
	if err != nil {
		log.Fatal().Err(err).Msg("telemetry initialization")
	}
	defer func() {
		flush, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = shutdownTelemetry(flush)
	}()
	kafka, err := kgo.NewClient(kgo.SeedBrokers(strings.Split(os.Getenv("KAFKA_BROKERS"), ",")...), kgo.RequiredAcks(kgo.AllISRAcks()), kgo.ProducerBatchMaxBytes(1048576))
	if err != nil {
		log.Fatal().Err(err).Msg("Kafka configuration")
	}
	defer kafka.Close()
	go publish(ctx, db, kafka)
	r := chi.NewRouter()
	r.Use(observability.HTTP)
	h := transport.Handler{Repo: persistence.Repository{DB: db}, Redis: redisClient}
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		sqlDB, e := db.DB()
		if e != nil || sqlDB.PingContext(r.Context()) != nil || redisClient.Ping(r.Context()).Err() != nil || kafka.Ping(r.Context()) != nil {
			w.WriteHeader(503)
			return
		}
		w.Write([]byte("ready"))
	})
	r.Handle("/metrics", promhttp.Handler())
	r.Post("/v1/transactions", h.API)
	r.Get("/v1/transactions/{id}", h.API)
	r.Get("/v1/ingestion/stats", h.API)
	r.Get("/internal/organizations/{organization_id}/credentials", h.Management)
	r.Post("/internal/organizations/{organization_id}/credentials", h.Management)
	r.Patch("/internal/organizations/{organization_id}/credentials/{id}", h.Management)
	r.Post("/internal/organizations/{organization_id}/retention", h.Retention)
	server := &http.Server{Addr: ":8081", Handler: r, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	log.Info().Str("service", "ingestion").Msg("listening on :8081")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal().Err(err).Msg("http server")
	}
}

var publishFailures = promauto.NewCounter(prometheus.CounterOpts{Name: "sentinel_outbox_publish_failures_total", Help: "Kafka publication failures retained for retry"})

func publish(ctx context.Context, db *gorm.DB, kafka *kgo.Client) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
				var rows []domain.Outbox
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).Where("published_at IS NULL AND available_at <= ?", time.Now().UTC()).Order("created_at").Limit(50).Find(&rows).Error; err != nil {
					return err
				}
				for _, row := range rows {
					var envelope struct {
						TraceParent   string `json:"trace_parent"`
						CorrelationID string `json:"correlation_id"`
					}
					if err := json.Unmarshal([]byte(row.Payload), &envelope); err != nil {
						return err
					}
					headers := []kgo.RecordHeader{{Key: "correlation-id", Value: []byte(envelope.CorrelationID)}}
					if envelope.TraceParent != "" {
						headers = append(headers, kgo.RecordHeader{Key: "traceparent", Value: []byte(envelope.TraceParent)})
					}
					sendCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
					err := kafka.ProduceSync(sendCtx, &kgo.Record{Topic: "transaction.received.v1", Key: []byte(row.OrganizationID), Value: []byte(row.Payload), Headers: headers}).FirstErr()
					cancel()
					if err != nil {
						publishFailures.Inc()
						row.Attempts++
						delay := time.Duration(1<<min(row.Attempts, 8)) * time.Second
						row.AvailableAt = time.Now().UTC().Add(delay)
						log.Error().Err(err).Str("event_id", row.ID).Msg("outbox publish failed; retained for retry")
					} else {
						now := time.Now().UTC()
						row.PublishedAt = &now
					}
					if err := tx.Save(&row).Error; err != nil {
						return err
					}
				}
				return nil
			})
			if err != nil {
				log.Error().Err(err).Msg("outbox transaction failed")
			}
		}
	}
}

func migrate(db *gorm.DB) {
	// Explicit versioned migration, never automatic synchronization in the API process.
	if err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY)`).Error; err != nil {
		log.Fatal().Err(err).Msg("migration table")
	}
	for index, file := range []string{"001_init.sql", "002_credentials.sql"} {
		version := index + 1
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("SELECT pg_advisory_xact_lock(51973811)").Error; err != nil {
				return err
			}
			var count int64
			if err := tx.Table("schema_migrations").Where("version = ?", version).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return nil
			}
			sql, err := migrations.ReadFile("migrations/" + file)
			if err != nil {
				return err
			}
			if err := tx.Exec(string(sql)).Error; err != nil {
				return err
			}
			return tx.Exec("INSERT INTO schema_migrations(version) VALUES(?)", version).Error
		})
		if err != nil {
			log.Fatal().Err(err).Msg("migration failed")
		}
	}
	if os.Getenv("DEMO_ENABLED") == "true" {
		sum := sha256.Sum256([]byte(os.Getenv("INGESTION_API_KEY")))
		key := domain.APIKey{ID: uuid.NewString(), OrganizationID: "11111111-1111-4111-8111-111111111111", Digest: hex.EncodeToString(sum[:]), Name: "Synthetic demo integration", Prefix: "synthetic-demo", CreatedAt: time.Now().UTC()}
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&key).Error; err != nil {
			log.Fatal().Err(err).Msg("seed key")
		}
	}
}
