class PoliciesController < ApplicationController
  def index
    render json: page(scoped(RiskPolicy).order(:priority, :id))
  end
  def create
    policy = RiskPolicy.new(policy_params.merge(organization_id: current_user.organization_id))
    authorize policy
    RiskPolicy.transaction {policy.save!; AuditEvent.record!(policy, "policy.created", actor: current_user)}
    render json: policy.dto, status: :created
  end
  def update
    policy = scoped(RiskPolicy).find(params[:id])
    authorize policy
    raise ArgumentError, "lock_version required" unless params.key?(:lock_version)
    RiskPolicy.transaction {policy.update!(policy_params); AuditEvent.record!(policy, "policy.updated", actor: current_user)}
    render json: policy.dto
  end
  private
  def policy_params
    params.permit(:name, :severity, :priority, :enabled, :open_case, :lock_version,
      conditions: [:risk_score_min, :amount_min, :velocity_hour_min, :new_device, :country_mismatch])
  end
end
