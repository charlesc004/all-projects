package observability

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/rs/zerolog/log"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

var latency = promauto.NewHistogramVec(prometheus.HistogramOpts{Name: "sentinel_ingestion_http_duration_seconds", Help: "HTTP ingestion/control request duration"}, []string{"method", "status"})

func Setup() (func(context.Context) error, error) {
	exporter, err := stdouttrace.New()
	if err != nil {
		return nil, err
	}
	provider := sdktrace.NewTracerProvider(sdktrace.WithBatcher(exporter), sdktrace.WithResource(resource.NewSchemaless(attribute.String("service.name", "sentinel-ingestion"))))
	otel.SetTracerProvider(provider)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	return provider.Shutdown, nil
}

func HTTP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		correlation := r.Header.Get("X-Correlation-ID")
		if _, err := uuid.Parse(correlation); err != nil {
			correlation = uuid.NewString()
		}
		r.Header.Set("X-Correlation-ID", correlation)
		w.Header().Set("X-Correlation-ID", correlation)
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
		ctx, span := otel.Tracer("sentinelml/ingestion").Start(ctx, "HTTP request")
		defer span.End()
		span.SetAttributes(attribute.String("correlation_id", correlation), attribute.String("http.request.method", r.Method))
		wrapped := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(wrapped, r.WithContext(ctx))
		status := wrapped.Status()
		if status == 0 {
			status = 200
		}
		method := r.Method
		switch method {
		case "GET", "POST", "PATCH", "DELETE", "PUT", "HEAD", "OPTIONS":
		default:
			method = "OTHER"
		}
		latency.WithLabelValues(method, strconv.Itoa(status)).Observe(time.Since(started).Seconds())
		route := "unmatched"
		if routeContext := chi.RouteContext(r.Context()); routeContext != nil { route = routeContext.RoutePattern() }
		span.SetName(method + " " + route)
		span.SetAttributes(attribute.Int("http.response.status_code", status), attribute.String("http.route", route))
		if status >= 500 {
			span.SetStatus(codes.Error, "dependency or request processing failure")
		}
		log.Info().Str("service", "ingestion").Str("request_id", correlation).Str("correlation_id", correlation).Str("trace_id", span.SpanContext().TraceID().String()).Str("route", route).Int("status", status).Dur("latency_ms", time.Since(started)).Msg("http request completed")
	})
}
