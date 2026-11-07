require_relative "../rails_helper"
RSpec.describe "Organization operations", type: :request do
  let!(:organization) {Organization.create!(name: "Operations Test")}
  let!(:admin) {User.create!(organization: organization, name: "Test Administrator", email: "admin@operations.example", role: "admin", password: "TestPassword!2026")}
  before do
    post "/api/auth/login", params: {email: admin.email, password: "TestPassword!2026"}, as: :json
    expect(response).to have_http_status(:ok)
  end
  it "creates and disables a member and records audit history" do
    post "/api/members", params: {name: "Test Analyst", email: "analyst@operations.example", role: "analyst", password: "AnalystPassword!2026"}, as: :json
    expect(response).to have_http_status(:created)
    member = JSON.parse(response.body)
    patch "/api/members/#{member.fetch('id')}", params: {disabled: true}, as: :json
    expect(response).to have_http_status(:ok)
    expect(User.find(member.fetch("id")).disabled_at).to be_present
    expect(AuditEvent.where(action: "user.updated").count).to eq(1)
  end
  it "preserves the final active administrator" do
    patch "/api/members/#{admin.id}", params: {role: "viewer"}, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(admin.reload.role).to eq("admin")
  end
  it "revokes a server-side session on logout" do
    expect(AuthSession.valid_now.where(user: admin).count).to eq(1)
    delete "/api/auth/logout"
    expect(response).to have_http_status(:no_content)
    expect(AuthSession.valid_now.where(user: admin).count).to eq(0)
    get "/api/settings"
    expect(response).to have_http_status(:unauthorized)
  end
  it "updates profile and retention preferences with validation" do
    patch "/api/profile", params: {name: "Updated Administrator", notification_preferences: {alerts: false}}, as: :json
    expect(response).to have_http_status(:ok)
    expect(admin.reload.notification_preferences["alerts"]).to be false
    patch "/api/organization", params: {retention_days: 1}, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    patch "/api/organization", params: {retention_days: 30}, as: :json
    expect(response).to have_http_status(:ok)
    expect(organization.reload.retention_days).to eq(30)
  end
  it "isolates notifications by both organization and user" do
    other = User.create!(organization: organization, name: "Another Analyst", email: "another@operations.example", role: "analyst", password: "AnalystPassword!2026")
    hidden = Notification.create!(organization: organization, user: other, title: "Private", message: "Other user's notification")
    get "/api/notifications"
    expect(JSON.parse(response.body).fetch("items")).to eq([])
    patch "/api/notifications/#{hidden.id}", params: {}, as: :json
    expect(response).to have_http_status(:not_found)
  end
end
