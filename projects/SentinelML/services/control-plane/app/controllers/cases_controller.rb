class CasesController < ApplicationController
  def index
    relation = scoped(FraudCase).includes(:assigned_user, alert: [:risk_policy, :assessment])
    relation = relation.joins(alert: :assessment).where(assessments: {transaction_id: params[:transaction_id]}) if params[:transaction_id].present?
    render json: page(relation.order(created_at: :desc, id: :desc))
  end
  def show
    render json: scoped(FraudCase).find(params[:id]).dto
  end
  def update
    record = scoped(FraudCase).find(params[:id])
    authorize record, :update?, policy_class: ApplicationPolicy
    raise ArgumentError, "lock_version required" unless params.key?(:lock_version)
    updated = CaseWorkflow.update!(record, params.permit(:status, :outcome, :assigned_user_id, :lock_version, :note).to_h, current_user)
    render json: updated.dto
  end
end
