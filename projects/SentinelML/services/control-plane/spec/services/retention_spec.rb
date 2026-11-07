require_relative "../rails_helper"
RSpec.describe RetentionJob do
  let(:event) { JSON.parse(File.read(File.join(ENV.fetch("CONTRACTS_DIR", "../../contracts"), "fixtures/transaction.scored.v1.json"))) }
  before do
    organization = Organization.create!(id: event.fetch("organization_id"), name: "Retention Test", retention_days: 7)
    RiskPolicy.create!(organization: organization, name: "Review", conditions: {risk_score_min: 0}, severity: "high")
    ScoringProcessor.call(event)
    Assessment.update_all(created_at: 30.days.ago)
  end
  it "preserves open investigations without requesting remote deletion" do
    expect(ServiceClient).not_to receive(:request)
    described_class.new.perform
    expect(Assessment.count).to eq(1)
  end
  it "holds local records when a remote owner cannot complete retention" do
    Alert.update_all(status: "resolved", updated_at: 30.days.ago)
    FraudCase.update_all(status: "resolved", updated_at: 30.days.ago)
    allow(ServiceClient).to receive(:request).and_raise(ServiceClient::Unavailable)
    expect {described_class.new.perform}.to raise_error(ServiceClient::Unavailable)
    expect(Assessment.count).to eq(1)
    expect(FraudCase.count).to eq(1)
  end
  it "deletes only eligible closed records after both owners acknowledge" do
    Alert.update_all(status: "resolved", updated_at: 30.days.ago)
    FraudCase.update_all(status: "resolved", updated_at: 30.days.ago)
    expect(ServiceClient).to receive(:request).with("INGESTION_URL", anything, method: :post, payload: hash_including(transaction_ids: [Assessment.first.transaction_id])).and_return({"deleted" => 1})
    expect(ServiceClient).to receive(:request).with("INFERENCE_URL", anything, method: :post, payload: anything).and_return({"deleted" => 1})
    described_class.new.perform
    expect(Assessment.count).to eq(0)
    expect(PolicyExecution.count).to eq(0)
    expect(AuditEvent.where(action: "retention.completed").count).to eq(1)
  end
end
