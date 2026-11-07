FROM rust:1.88-slim-bookworm AS toolchain
RUN apt-get update && apt-get install -y cmake clang pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
RUN rustup component add rustfmt clippy
RUN apt-get update && apt-get install -y --no-install-recommends curl libcurl4-openssl-dev && rm -rf /var/lib/apt/lists/*
FROM toolchain AS onnxruntime
ARG ONNX_RUNTIME_VERSION=1.22.0
RUN mkdir -p /onnx && curl -fsSL --retry 3 "https://github.com/microsoft/onnxruntime/releases/download/v${ONNX_RUNTIME_VERSION}/onnxruntime-linux-x64-${ONNX_RUNTIME_VERSION}.tgz" | tar -xz --strip-components=1 -C /onnx
FROM toolchain AS build
COPY --from=onnxruntime /onnx /onnx
ENV ORT_DYLIB_PATH=/onnx/lib/libonnxruntime.so.1.22.0
WORKDIR /src
COPY services/inference services/inference
COPY contracts contracts
COPY ml/artifacts ml/artifacts
WORKDIR /src/services/inference
RUN --mount=type=cache,id=sentinel-cargo-registry,target=/usr/local/cargo/registry --mount=type=cache,id=sentinel-cargo-target,target=/src/services/inference/target cargo build --locked --release && mkdir -p /build-artifacts && cp target/release/inference /build-artifacts/ && find target/release -maxdepth 1 -name '*.so*' -exec cp {} /build-artifacts/ \;
FROM build AS test
RUN --mount=type=cache,id=sentinel-cargo-registry,target=/usr/local/cargo/registry --mount=type=cache,id=sentinel-cargo-target,target=/src/services/inference/target cargo tree --locked --edges normal --prefix none --format "{p}" > /build-artifacts/active-rust-dependencies.txt && cargo fmt --check && cargo clippy --locked --release --all-targets -- -D warnings && cargo test --locked --release && (cargo test --locked --release --no-run --message-format=json > /tmp/test-artifacts.json) && cat /tmp/test-artifacts.json | sed -n 's/.*"executable":"\([^" ]*\)".*/\1/p' | xargs -r -I{} cp {} /build-artifacts/inference-tests
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libssl3 libgomp1 libstdc++6 && rm -rf /var/lib/apt/lists/* && useradd -m -u 10001 sentinel
COPY --from=build /build-artifacts/ /app/
COPY --from=onnxruntime /onnx /app/ort
ENV LD_LIBRARY_PATH=/app/ort/lib ORT_DYLIB_PATH=/app/ort/lib/libonnxruntime.so.1.22.0
USER 10001:10001
ENTRYPOINT ["/app/inference"]
