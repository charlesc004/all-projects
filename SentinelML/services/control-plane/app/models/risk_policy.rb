class RiskPolicy < ApplicationRecord
  belongs_to :organization
  validates :name, presence: true, length: {maximum: 120}
  validates :severity, inclusion: {in: %w[low medium high critical]}
  validates :priority, numericality: {only_integer: true, in: 0..100}
  validate :valid_dsl
  def valid_dsl
    PolicyEngine.validate!(conditions)
  rescue ArgumentError => error
    errors.add(:conditions, error.message)
  end
  def dto
    attributes.slice("id", "name", "conditions", "severity", "enabled", "open_case", "priority", "lock_version")
  end
end
