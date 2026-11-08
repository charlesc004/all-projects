require "net/http"
class DemoController < ApplicationController
  def create
    authorize :demo, :update?, policy_class: ApplicationPolicy
    return render json: {error: "demo mode disabled"}, status: :forbidden unless ENV["DEMO_ENABLED"] == "true" && current_user.organization_id == "11111111-1111-4111-8111-111111111111"
    suspicious = params[:scenario] == "suspicious"
    payload = {account_token: "tok_synthetic_#{SecureRandom.hex(6)}", merchant: suspicious ? "Horizon Electronics" : "Northstar Market",
      amount: suspicious ? 6500 : 84.50, currency: "USD", country: "US", account_age_days: suspicious ? 4 : 850,
      velocity_hour: suspicious ? 12 : 1, device_trust: suspicious ? 0.02 : 0.95, distance_km: suspicious ? 1800 : 3,
      failed_attempts: suspicious ? 5 : 0, new_device: suspicious, country_mismatch: suspicious}
    uri = URI(ENV.fetch("INGESTION_URL") + "/v1/transactions")
    request = Net::HTTP::Post.new(uri, "Content-Type" => "application/json", "Authorization" => "Bearer #{ENV.fetch('INGESTION_API_KEY')}", "Idempotency-Key" => SecureRandom.uuid)
    request.body = payload.to_json
    response = Net::HTTP.start(uri.host, uri.port, open_timeout: 3, read_timeout: 8) { |http| http.request(request) }
    render json: JSON.parse(response.body), status: response.code.to_i
  rescue Timeout::Error, Errno::ECONNREFUSED
    render json: {error: "ingestion unavailable"}, status: :service_unavailable
  end
end
