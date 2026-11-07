require_relative "../rails_helper"
RSpec.describe "Control-plane access", type: :request do
  it "rejects unauthenticated access to organization data" do
    get "/api/transactions"
    expect(response).to have_http_status(:unauthorized)
  end
  it "does not expose ORM records in the session endpoint" do
    get "/api/auth/session"
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).keys.sort).to eq(%w[csrf_token demo_enabled user])
    expect(JSON.parse(response.body)["user"]).to be_nil
  end
  it "prevents viewers from mutating policies and hides other organizations" do
    first = Organization.create!(name: "First Tenant")
    second = Organization.create!(name: "Second Tenant")
    User.create!(organization: first, name: "Test Viewer", email: "viewer@test.example", role: "viewer", password: "TestPassword!2026")
    policy = RiskPolicy.create!(organization: second, name: "Hidden Policy", severity: "high", conditions: {risk_score_min: 70})
    post "/api/auth/login", params: {email: "viewer@test.example", password: "TestPassword!2026"}, as: :json
    expect(response).to have_http_status(:ok)
    get "/api/policies"
    expect(JSON.parse(response.body).fetch("items")).to eq([])
    patch "/api/policies/#{policy.id}", params: {enabled: false, lock_version: 0}, as: :json
    expect(response).to have_http_status(:not_found)
    post "/api/policies", params: {name: "Forbidden", severity: "high", conditions: {risk_score_min: 70}}, as: :json
    expect(response).to have_http_status(:forbidden)
  end
end
