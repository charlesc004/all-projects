class FeedbackController < ApplicationController
  def index
    authorize :feedback, :create?, policy_class: ApplicationPolicy
    relation = scoped(AnalystFeedback).includes(fraud_case: {alert: :assessment}).order(:created_at)
    render json: {items: relation.limit(1000).map { |row| assessment = row.fraud_case.alert.assessment; {id: row.id, case_id: row.fraud_case_id, transaction_id: assessment.transaction_id, transaction_created_at: assessment.data.fetch("transaction").fetch("created_at"), model_version: assessment.model_version, feature_version: assessment.data.fetch("feature_version"), outcome: row.outcome, features: row.features, created_at: row.created_at.iso8601} }}
  end
end
