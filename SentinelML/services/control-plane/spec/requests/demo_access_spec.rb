require_relative "../rails_helper"
RSpec.describe "Demo access", type: :request do
  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("DEMO_ENABLED").and_return("true")
    allow(ENV).to receive(:[]).with("DEMO_PASSWORD").and_return("DemoAccessTest!2026")
  end
  def create_demo_user(disabled: false)
    organization = Organization.create!(id: "11111111-1111-4111-8111-111111111111", name: "Demo Tenant")
    User.create!(organization: organization, name: "Demo Admin", email: "admin@sentinelml.example", role: "admin", password: "DemoAccessTest!2026", disabled_at: disabled ? Time.current : nil)
  end
  it "hides and rejects demo access when disabled" do
    allow(ENV).to receive(:[]).with("DEMO_ENABLED").and_return("false")
    get "/api/auth/session"
    expect(JSON.parse(response.body).fetch("demo_enabled")).to eq(false)
    post "/api/auth/demo", as: :json
    expect(response).to have_http_status(:not_found)
  end
  it "signs into the seeded tenant through a normal revocable session" do
    user = create_demo_user
    post "/api/auth/demo", params: {email: "other@example.com", password: "ignored"}, as: :json
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).fetch("user").fetch("id")).to eq(user.id)
    get "/api/auth/session"
    expect(JSON.parse(response.body).fetch("user").fetch("id")).to eq(user.id)
    delete "/api/auth/logout"
    get "/api/auth/session"
    expect(JSON.parse(response.body).fetch("user")).to be_nil
  end
  it "does not authenticate a disabled demo member" do
    create_demo_user(disabled: true)
    post "/api/auth/demo", as: :json
    expect(response).to have_http_status(:unauthorized)
  end
  it "does not use a matching email from a different tenant" do
    organization = Organization.create!(name: "Other Tenant")
    User.create!(organization: organization, name: "Other Admin", email: "admin@sentinelml.example", role: "admin", password: "DemoAccessTest!2026")
    post "/api/auth/demo", as: :json
    expect(response).to have_http_status(:service_unavailable)
    get "/api/auth/session"
    expect(JSON.parse(response.body).fetch("user")).to be_nil
  end
end
