class Assessment < ApplicationRecord
  belongs_to :organization
  has_many :alerts
  def dto
    {id: id, transaction_id: transaction_id, created_at: created_at.iso8601, risk_score: risk_score,
      risk_level: risk_level, model_version: model_version, **data.symbolize_keys}
  end
end
