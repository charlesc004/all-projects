class OutboxJob
  include Sidekiq::Job
  def perform
    require_relative "../../karafka"
    ControlOutbox.where(published_at: nil).order(:created_at).limit(100).each do |row|
      row.with_lock do
        next if row.published_at
        headers = {"correlation-id" => row.event.fetch("correlation_id")}
        headers["traceparent"] = row.event["trace_parent"] if row.event["trace_parent"]
        Karafka.producer.produce_sync(headers: headers, topic: row.topic, key: row.event.fetch("organization_id"), payload: row.event.to_json)
        row.update!(published_at: Time.current)
      end
    end
  end
end
