class FraudCase < ApplicationRecord
  belongs_to :organization
  belongs_to :alert
  belongs_to :assigned_user, class_name: "User", optional: true
  validates :status, inclusion: {in: %w[new acknowledged investigating escalated resolved dismissed]}
  validates :outcome, inclusion: {in: %w[confirmed_fraud false_positive legitimate_transaction inconclusive]}, allow_nil: true
  def dto
    {id: id, status: status, outcome: outcome, notes: notes, lock_version: lock_version,
      assigned_user_id: assigned_user_id, assigned_user: assigned_user&.name, created_at: created_at.iso8601, alert: alert.dto.except(:case_id)}
  end
end
