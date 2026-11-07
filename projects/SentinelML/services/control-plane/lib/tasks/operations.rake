namespace :sentinel do
  desc "Publish durable control events and schedule bounded retention work"
  task operations: :environment do
    stopping = false
    %w[TERM INT].each { |signal| Signal.trap(signal) { stopping = true } }
    until stopping
      begin
        OutboxJob.new.perform
        hour = Time.current.utc.strftime("%Y%m%d%H")
        schedule = Sidekiq.redis { |connection| connection.set("sentinel:retention:#{hour}", "queued", nx: true, ex: 7200) }
        RetentionJob.perform_async if schedule
      rescue StandardError => error
        Rails.logger.error({event: "operations.retry", error: error.class.name}.to_json)
      end
      5.times { break if stopping; sleep 1 }
    end
  end
end
