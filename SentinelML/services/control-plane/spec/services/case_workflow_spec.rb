require_relative "../rails_helper"
RSpec.describe CaseWorkflow do
  before do
    event = JSON.parse(File.read(File.join(ENV.fetch("CONTRACTS_DIR", "../../contracts"), "fixtures/transaction.scored.v1.json")))
    @organization = Organization.create!(id: event.fetch("organization_id"), name: "Workflow Tenant")
    RiskPolicy.create!(organization: @organization, name: "Review", conditions: {risk_score_min: 50}, severity: "high")
    ScoringProcessor.call(event)
    @actor = User.create!(organization: @organization, name: "Test Analyst", email: "analyst@test.example", role: "analyst", password: "TestPassword!2026")
  end
  it "saves notes, audit and reviewed feedback atomically" do
    record = FraudCase.first
    described_class.update!(record, {"status" => "resolved", "outcome" => "confirmed_fraud", "note" => "Evidence reviewed", "lock_version" => 0}, @actor)
    expect(record.reload.notes.first.fetch("text")).to eq("Evidence reviewed")
    expect(AnalystFeedback.first.outcome).to eq("confirmed_fraud")
    expect(AnalystFeedback.first.features.length).to eq(9)
    expect(AuditEvent.where(action: "case.updated").count).to eq(1)
  end
  it "rejects assigning a user from another tenant" do
    other = Organization.create!(name: "Other Tenant")
    outsider = User.create!(organization: other, name: "Other Analyst", email: "other@test.example", role: "analyst", password: "TestPassword!2026")
    expect {described_class.update!(FraudCase.first, {"assigned_user_id" => outsider.id, "lock_version" => 0}, @actor)}.to raise_error(ActiveRecord::RecordNotFound)
    expect(FraudCase.first.assigned_user_id).to be_nil
  end
end
