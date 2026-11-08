class AlertsController < ApplicationController
  def index
    relation = scoped(Alert).includes(:risk_policy, :assessment, :fraud_case)
    relation = relation.where(status: params[:status]) if params[:status].present?
    relation = relation.joins(:assessment).where(assessments: {transaction_id: params[:transaction_id]}) if params[:transaction_id].present?
    if params[:q].present?
      term = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].to_s.first(100))}%"
      relation = relation.joins(:assessment, :risk_policy).where("assessments.transaction_id::text ILIKE ? OR assessments.data->'transaction'->>'merchant' ILIKE ? OR risk_policies.name ILIKE ?", term, term, term)
    end
    render json: page(relation.order(created_at: :desc, id: :desc))
  end
  def bulk_update
    require_risk_manager! if current_user.role == "viewer"
    items = params.require(:items)
    raise ArgumentError, "select 1-100 alerts" unless items.is_a?(Array) && items.length.between?(1, 100)
    ids = items.map { |item| item.require(:id) }
    raise ArgumentError, "duplicate alert identifiers" unless ids.uniq.length == ids.length
    Alert.transaction do
      Organization.lock.find(current_user.organization_id)
      items.sort_by { |item| item.fetch(:id) }.each do |item|
        alert = scoped(Alert).find(item.fetch(:id))
        authorize alert, :update?, policy_class: ApplicationPolicy
        alert.update!(status: params.require(:status), lock_version: item.require(:lock_version))
        AuditEvent.record!(alert, "alert.bulk_updated", actor: current_user)
      end
    end
    render json: {updated: items.length}
  end
  def update
    record = scoped(Alert).find(params[:id])
    authorize record, :update?, policy_class: ApplicationPolicy
    raise ArgumentError, "lock_version required" unless params.key?(:lock_version)
    Alert.transaction do
      Organization.lock.find(current_user.organization_id)
      record.update!(params.permit(:status, :lock_version))
      AuditEvent.record!(record, "alert.updated", actor: current_user)
    end
    render json: record.dto
  end
end
