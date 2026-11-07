require_relative "../rails_helper"
RSpec.describe "Bulk alert operations", type: :request do
  let!(:organization) {Organization.create!(name: "Bulk Test")}
  let!(:admin) {User.create!(organization: organization, name: "Test Admin", email: "bulk@operations.example", role: "admin", password: "TestPassword!2026")}
  before do
    event = JSON.parse(File.read(File.join(ENV.fetch("CONTRACTS_DIR", "../../contracts"), "fixtures/transaction.scored.v1.json")))
    event["organization_id"] = organization.id
    event["payload"]["transaction"]["organization_id"] = organization.id
    RiskPolicy.create!(organization: organization, name: "Review", conditions: {risk_score_min: 0}, severity: "high")
    ScoringProcessor.call(event)
    post "/api/auth/login", params: {email: admin.email, password: "TestPassword!2026"}, as: :json
  end
  it "updates selected alerts and records an audit entry" do
    alert = Alert.first
    patch "/api/alerts/bulk", params: {status: "acknowledged", items: [{id: alert.id, lock_version: alert.lock_version}]}, as: :json
    expect(response).to have_http_status(:ok)
    expect(alert.reload.status).to eq("acknowledged")
    expect(AuditEvent.where(action: "alert.bulk_updated").count).to eq(1)
  end
  it "rejects a stale version without applying the batch" do
    alert = Alert.first
    patch "/api/alerts/bulk", params: {status: "resolved", items: [{id: alert.id, lock_version: alert.lock_version + 1}]}, as: :json
    expect(response).to have_http_status(:conflict)
    expect(alert.reload.status).to eq("new")
  end
end
