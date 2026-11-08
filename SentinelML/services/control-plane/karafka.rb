ENV["RAILS_ENV"] ||= "production"
require_relative "config/environment"
require_relative "app/consumers/scoring_consumer"

class KarafkaApp < Karafka::App
  setup do |config|
    config.kafka = {"bootstrap.servers": ENV.fetch("KAFKA_BROKERS"), "auto.offset.reset": "earliest"}
    config.client_id = "sentinel-control"
    config.consumer_persistence = true
  end
  routes.draw do
    consumer_group :sentinel_control_v1 do
      topic "transaction.scored.v1" do
        consumer ScoringConsumer
      end
      topic "model.activated.v1" do
        consumer ScoringConsumer
      end
    end
  end
end
