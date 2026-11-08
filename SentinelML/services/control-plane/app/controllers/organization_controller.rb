class OrganizationController < ApplicationController
  before_action :require_admin!
  def update
    organization = current_user.organization
    attributes = params.permit(:name, :retention_days)
    Organization.transaction {organization.update!(attributes); AuditEvent.record!(organization, "organization.updated", actor: current_user, metadata: attributes.to_h)}
    render json: {name: organization.name, retention_days: organization.retention_days}
  end
end
