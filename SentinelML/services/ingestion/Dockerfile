FROM golang:1.27.3-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,id=sentinel-go-mod,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,id=sentinel-go-mod,target=/go/pkg/mod --mount=type=cache,id=sentinel-go-build,target=/root/.cache/go-build CGO_ENABLED=0 go build -mod=readonly -o /ingestion ./cmd/api
FROM build AS test
COPY --from=contracts . /contracts
RUN --mount=type=cache,id=sentinel-go-mod,target=/go/pkg/mod --mount=type=cache,id=sentinel-go-build,target=/root/.cache/go-build go vet ./... && go test ./... && CGO_ENABLED=0 go test -tags integration -c -o /persistence.test ./internal/persistence && CGO_ENABLED=0 go test -tags integration -c -o /transport.test ./internal/transport
FROM alpine:3.22 AS integration-test
COPY --from=test /ingestion /ingestion
COPY --from=test /persistence.test /persistence.test
COPY --from=test /transport.test /transport.test
CMD ["sh", "-ec", "/ingestion migrate && /persistence.test -test.v && /transport.test -test.v"]
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /ingestion /ingestion
ENTRYPOINT ["/ingestion"]
