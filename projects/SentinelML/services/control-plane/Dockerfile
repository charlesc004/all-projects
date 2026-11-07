FROM ruby:3.3-slim AS build
RUN apt-get update && apt-get install -y build-essential libpq-dev librdkafka-dev git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Gemfile* .
RUN --mount=type=cache,id=sentinel-gem-cache,target=/usr/local/bundle/cache bundle install
COPY . .
FROM ruby:3.3-slim
RUN apt-get update && apt-get install -y libpq5 librdkafka1 && rm -rf /var/lib/apt/lists/* && useradd -m -u 10001 sentinel
WORKDIR /app
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build --chown=sentinel:sentinel /app /app
RUN mkdir -p /app/tmp/pids /app/tmp/cache /app/log && chown -R sentinel:sentinel /app/tmp /app/log
USER 10001:10001
EXPOSE 3001
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3001"]
