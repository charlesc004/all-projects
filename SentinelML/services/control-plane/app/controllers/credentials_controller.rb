class CredentialsController < ApplicationController
  before_action :require_admin!
  def index
    render json: ServiceClient.request("INGESTION_URL", "/internal/organizations/#{current_user.organization_id}/credentials")
  end
  def create
    data = ServiceClient.request("INGESTION_URL", "/internal/organizations/#{current_user.organization_id}/credentials", method: :post, payload: params.permit(:name, :rotate_id).to_h)
    AuditEvent.record!(current_user.organization, params[:rotate_id].present? ? "credential.rotated" : "credential.created", actor: current_user, metadata: {key_id: data.fetch("id"), name: data.fetch("name")})
    render json: data, status: :created
  end
  def update
    raise ArgumentError, "credential ID must be a UUID" unless params[:id].to_s.match?(/\A[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/i)
    data = ServiceClient.request("INGESTION_URL", "/internal/organizations/#{current_user.organization_id}/credentials/#{params[:id]}", method: :patch)
    AuditEvent.record!(current_user.organization, "credential.revoked", actor: current_user, metadata: {key_id: params[:id]})
    render json: data
  end
end
