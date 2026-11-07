class AnalystFeedback < ApplicationRecord
  belongs_to :organization
  belongs_to :fraud_case
  belongs_to :user
end
