class PolicyExecutionsController < ApplicationController
  def index
    relation = scoped(PolicyExecution).includes(:risk_policy, :assessment)
    relation = relation.where(risk_policy_id: params[:policy_id]) if params[:policy_id].present?
    render json: page(relation.order(created_at: :desc, id: :desc))
  end
end
