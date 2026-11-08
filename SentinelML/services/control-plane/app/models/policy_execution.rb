class PolicyExecution < ApplicationRecord
  belongs_to :organization
  belongs_to :risk_policy
  belongs_to :assessment
  def dto
    {id: id, policy: risk_policy.name, transaction_id: assessment.transaction_id, matched: matched, conditions: conditions, created_at: created_at.iso8601}
  end
end
