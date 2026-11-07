require_relative "../rails_helper"
RSpec.describe ScoringProcessor do
  let(:fixture) { JSON.parse(File.read(File.join(ENV.fetch("CONTRACTS_DIR", "../../contracts"), "fixtures/transaction.scored.v1.json"))) }
  before do
    organization = Organization.create!(id: fixture.fetch("organization_id"), name: "Test Organization")
    RiskPolicy.create!(organization: organization, name: "Risk review", conditions: {risk_score_min: 70}, severity: "high")
  end
  it "persists a real scored event and creates a policy alert, case, and audit event" do
    described_class.call(fixture)
    expect(Assessment.count).to eq(1)
    expect(Alert.count).to eq(1)
    expect(FraudCase.count).to eq(1)
    expect(AuditEvent.count).to eq(1)
    expect(ControlOutbox.count).to eq(1)
  end
  it "does not duplicate assessments, alerts, or cases on replay" do
    2.times { described_class.call(fixture) }
    expect(Assessment.count).to eq(1)
    expect(Alert.count).to eq(1)
    expect(FraudCase.count).to eq(1)
  end
  it "rejects inconsistent organization ownership" do
    fixture["organization_id"] = SecureRandom.uuid
    expect {described_class.call(fixture)}.to raise_error(ArgumentError, "ownership mismatch")
    expect(Assessment.count).to eq(0)
  end
end
