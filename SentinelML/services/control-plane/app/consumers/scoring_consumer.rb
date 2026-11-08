class ScoringConsumer < Karafka::BaseConsumer
  def consume
    messages.each do |message|
      attempts = 0
      begin
        event = JSON.parse(message.raw_payload)
        case event.fetch("event_type")
        when "transaction.scored.v1" then ScoringProcessor.call(event)
        when "model.activated.v1" then ModelRegistry.sync!(event)
        else raise ArgumentError, "unsupported control-plane event"
        end
      rescue StandardError => error
        attempts += 1
        ServiceMetrics.consumption_failure!
        Rails.logger.error({event: "scoring.consume.failed", error: error.class.name, attempt: attempts}.to_json)
        if attempts < 5
          sleep(0.2 * (2**attempts))
          retry
        end
        Karafka.producer.produce_sync(topic: "#{message.topic}.dlq", payload: message.raw_payload)
      end
      mark_as_consumed(message)
    end
  end
end
