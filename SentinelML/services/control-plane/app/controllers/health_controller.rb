class HealthController < ApplicationController
  skip_before_action :authenticate!
  def show
    render json: {status: "ok"}
  end
  def ready
    ActiveRecord::Base.connection.execute("SELECT 1")
    redis = Redis.new(url: ENV.fetch("REDIS_URL"))
    redis.ping
    render json: {status: "ready"}
  rescue StandardError
    render json: {status: "unavailable"}, status: :service_unavailable
  ensure
    redis&.close
  end
  def metrics
    gauges = {sentinel_alerts_total: Alert.count, sentinel_cases_total: FraudCase.count, sentinel_policy_evaluations: PolicyExecution.count, sentinel_control_outbox_pending: ControlOutbox.where(published_at: nil).count, sentinel_case_feedback_records: AnalystFeedback.count}
    output = gauges.map { |name, value| "# TYPE #{name} gauge\n#{name} #{value}\n" }.join
    output += "# TYPE sentinel_event_consumption_failures_total counter\nsentinel_event_consumption_failures_total #{ServiceMetrics.consumption_failures}\n"
    render plain: output
  end
end
