require "net/http"
class OperationalMetrics
  QUERIES = {
    incoming_per_second: "sum(rate(sentinel_transactions_received_total[1m]))",
    scoring_per_second: "sum(rate(sentinel_inference_total[1m]))",
    inference_p95_seconds: "histogram_quantile(0.95, sum by (le) (rate(sentinel_inference_duration_seconds_bucket[5m])))",
    consumer_lag: "sum(sentinel_kafka_consumer_lag)",
    model_loaded: "min(sentinel_model_loaded)",
    service_scrapes_up: 'sum(up{job=~"ingestion|inference|control"})'
  }.freeze
  def self.call
    expression = QUERIES.map { |name, query| "label_replace((#{query}), \"signal\", \"#{name}\", \"\", \"\")" }.join(" or ")
    uri = URI(ENV.fetch("PROMETHEUS_URL", "http://prometheus:9090") + "/api/v1/query")
    uri.query = URI.encode_www_form(query: expression)
    response = Net::HTTP.start(uri.host, uri.port, open_timeout: 1, read_timeout: 2) { |http| http.get(uri.request_uri) }
    raise "metrics unavailable" unless response.is_a?(Net::HTTPSuccess)
    data = JSON.parse(response.body)
    raise "metrics unavailable" unless data["status"] == "success"
    values = QUERIES.transform_values {nil}
    data.fetch("data").fetch("result").each do |row|
      name = row.fetch("metric").fetch("signal").to_sym
      number = Float(row.fetch("value").last)
      values[name] = number if values.key?(name) && number.finite?
    end
    {status: "measured", values: values, observed_at: Time.current.iso8601}
  rescue StandardError
    {status: "unavailable", values: {}, observed_at: Time.current.iso8601}
  end
end
