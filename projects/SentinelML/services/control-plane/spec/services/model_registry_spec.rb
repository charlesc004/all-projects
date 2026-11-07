require_relative "../rails_helper"
RSpec.describe ModelRegistry do
  let!(:organization) {Organization.create!(name: "Registry Test")}
  let(:manifest) {JSON.parse(File.read(File.join(ENV.fetch("MODEL_DIR", "../../ml/artifacts/v1"), "metadata.json")))}
  let(:event) {{"event_id" => SecureRandom.uuid, "event_type" => "model.activated.v1", "schema_version" => 1, "organization_id" => organization.id, "transaction_id" => "00000000-0000-0000-0000-000000000000", "correlation_id" => SecureRandom.uuid, "occurred_at" => Time.current.iso8601(6), "payload" => {"model_version" => "v1", "checksum" => manifest.fetch("artifact_checksum"), "metadata" => manifest}}}
  it "projects activation idempotently and isolates deployment by tenant" do
    2.times {described_class.sync!(event)}
    expect(ModelDeployment.count).to eq(1)
    expect(AuditEvent.where(action: "model.activated").count).to eq(1)
    expect(described_class.active_for(organization).version).to eq("v1")
    expect(ModelDeployment.where(organization: Organization.create!(name: "Other Tenant")).count).to eq(0)
  end
  it "rejects a mismatched checksum and manifest" do
    event["payload"]["checksum"] = "a" * 64
    expect {described_class.sync!(event)}.to raise_error(ArgumentError, "activation manifest mismatch")
    expect(ModelDeployment.count).to eq(0)
  end
end
