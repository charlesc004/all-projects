class AssessmentsController < ApplicationController
  def index
    relation = scoped(Assessment)
    relation = relation.where(risk_level: params[:risk_level]) if params[:risk_level].present?
    if params[:q].present?
      term = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].to_s.first(100))}%"
      relation = relation.where("transaction_id::text ILIKE ? OR data->'transaction'->>'merchant' ILIKE ?", term, term)
    end
    relation = relation.where("created_at >= ?", Time.iso8601(params[:from])) if params[:from].present?
    relation = relation.where("created_at <= ?", Time.iso8601(params[:to])) if params[:to].present?
    sort = params[:sort] == "risk_score" ? :risk_score : :created_at
    direction = params[:direction] == "asc" ? :asc : :desc
    render json: page(relation.order(sort => direction, id: :desc))
  end
  def show
    render json: scoped(Assessment).find(params[:id]).dto
  end
end
