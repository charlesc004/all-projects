class ModelsController < ApplicationController
  def index
    active = ModelRegistry.active_for(current_user.organization)
    render json: {items: ModelVersion.order(created_at: :desc).map { |model| model.dto.merge(active: model.id == active&.id) }}
  end
  def refresh
    require_risk_manager!
    manifests = ServiceClient.request("INFERENCE_URL", "/internal/models").fetch("items")
    manifests.each do |manifest|
      version = ModelVersion.find_or_initialize_by(version: manifest.fetch("model_version"))
      raise ArgumentError, "model versions are immutable" if version.persisted? && version.metadata.fetch("artifact_checksum") != manifest.fetch("artifact_checksum")
      version.update!(metadata: manifest)
    end
    index
  end
  def activate
    require_risk_manager!
    command_id = params.require(:command_id).to_s
    raise ArgumentError, "command_id must be a UUID" unless command_id.match?(/\A[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/i)
    version = ModelVersion.find_by!(version: params[:version])
    event = ServiceClient.request("INFERENCE_URL", "/internal/models/activate", method: :post, payload: {organization_id: current_user.organization_id, model_version: version.version, command_id: command_id, correlation_id: SecureRandom.uuid})
    ModelRegistry.sync!(event)
    render json: {model_version: version.version, activated: true, event_id: event.fetch("event_id")}
  end
end
