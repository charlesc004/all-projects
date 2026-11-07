class Organization < ApplicationRecord
  has_many :users
  validates :name, presence: true
  validates :retention_days, numericality: {only_integer: true, in: 7..3650}
end
