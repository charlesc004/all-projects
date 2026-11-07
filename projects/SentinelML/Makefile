.PHONY: up train seed demo test down
up:
	docker compose up -d --build
train:
	docker compose --profile tools run --rm train
seed:
	docker compose exec control bundle exec rails db:seed
demo:
	python scripts/demo_traffic.py --count 100
test:
	python -m pytest ml/tests contracts
	cd services/ingestion && go test ./...
	cd services/inference && cargo test
	cd services/control-plane && RAILS_ENV=test bundle exec rspec
	cd frontend && npm run typecheck && npm test
down:
	docker compose down
