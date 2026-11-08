class ModelRegistry
  def self.sync!(event)
    schema = JSON.parse(File.read(File.join(ENV.fetch("CONTRACTS_DIR", "../../contracts"), "events/model.activated.v1.json")))
    raise ArgumentError, "invalid model activation event" unless JSONSchemer.schema(schema).valid?(event)
    payload = event.fetch("payload")
    manifest = payload.fetch("metadata")
    raise ArgumentError, "activation manifest mismatch" unless manifest.fetch("model_version") == payload.fetch("model_version") && manifest.fetch("artifact_checksum") == payload.fetch("checksum")
    Organization.transaction do
      organization = Organization.lock.find(event.fetch("organization_id"))
      deployment = ModelDeployment.find_by(organization: organization)
      activated_at = Time.iso8601(event.fetch("occurred_at"))
      return if deployment && (deployment.source_event_id == event.fetch("event_id") || deployment.activated_at > activated_at)
      version = ModelVersion.find_or_initialize_by(version: payload.fetch("model_version"))
      if version.persisted? && version.metadata.fetch("artifact_checksum") != payload.fetch("checksum")
        raise ArgumentError, "model versions are immutable"
      end
      version.metadata = manifest
      version.save!
      deployment ||= ModelDeployment.new(organization: organization)
      deployment.update!(model_version: version, source_event_id: event.fetch("event_id"), activated_at: activated_at)
      AuditEvent.record!(organization, "model.activated", metadata: {model_version: version.version, event_id: event.fetch("event_id"), checksum: payload.fetch("checksum")})
    end
  end
  def self.active_for(organization)
    ModelDeployment.includes(:model_version).find_by(organization: organization)&.model_version || ModelVersion.find_by(active: true)
  end
end
