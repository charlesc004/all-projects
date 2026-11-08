require_relative "../rails_helper"
RSpec.describe ModelMonitor do
  let!(:organization) {Organization.create!(name: "Monitoring Test")}
  before do
    manifest = JSON.parse(File.read(File.join(ENV.fetch("MODEL_DIR", "../../ml/artifacts/v1"), "metadata.json")))
    ModelVersion.create!(version: "v1", metadata: manifest, active: true)
  end
  it "does not claim measured drift or accuracy without observations" do
    result = described_class.call(organization)
    expect(result[:status]).to eq("insufficient_data")
    expect(result[:features].all? { |feature| feature[:psi].nil? }).to be true
    expect(result[:feedback][:precision]).to be_nil
  end
  it "detects a measured feature shift in persisted snapshots" do
    fixture = JSON.parse(File.read(File.join(ENV.fetch("CONTRACTS_DIR", "../../contracts"), "fixtures/transaction.scored.v1.json")))
    60.times do
      data = fixture.fetch("payload").deep_dup
      data["features"][0] = 20.0
      Assessment.create!(organization: organization, transaction_id: SecureRandom.uuid, source_event_id: SecureRandom.uuid, data: data, risk_score: data["risk_score"], risk_level: data["risk_level"], model_version: "v1")
    end
    result = described_class.call(organization)
    expect(result[:status]).to eq("measured")
    expect(result[:features].find { |feature| feature[:name] == "log_amount" }[:psi]).to be > 0.25
  end
end
