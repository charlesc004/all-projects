class ServiceMetrics
  def self.consumption_failure!
    redis = Redis.new(url: ENV.fetch("REDIS_URL"))
    redis.incr("sentinel:control:consumption_failures")
  rescue Redis::BaseError
    Rails.logger.warn({event: "metrics.storage.unavailable"}.to_json)
  ensure
    redis&.close
  end
  def self.consumption_failures
    redis = Redis.new(url: ENV.fetch("REDIS_URL"))
    redis.get("sentinel:control:consumption_failures").to_i
  ensure
    redis&.close
  end
end
