class Alert < ApplicationRecord
  belongs_to :organization
  belongs_to :assessment
  belongs_to :risk_policy
  has_one :fraud_case
  validates :status, inclusion: {in: %w[new acknowledged investigating escalated resolved dismissed]}
  def dto
    {id: id, severity: severity, status: status, lock_version: lock_version, created_at: created_at.iso8601,
      policy: risk_policy.name, case_id: fraud_case&.id, assessment: assessment.dto}
  end
end
