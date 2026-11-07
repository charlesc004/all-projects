class User < ApplicationRecord
  belongs_to :organization
  has_secure_password
  validates :email, presence: true, uniqueness: true
  validates :email, format: {with: URI::MailTo::EMAIL_REGEXP}
  validates :name, presence: true, length: {maximum: 120}
  before_validation { self.email = email.to_s.downcase.strip }
  validates :role, inclusion: {in: %w[admin analyst risk_manager viewer]}
  validates :password, length: {minimum: 12}, if: -> {password.present?}
  def dto
    {id: id, name: name, email: email, role: role, disabled: disabled_at.present?, notification_preferences: notification_preferences, organization: {id: organization_id, name: organization.name}}
  end
end
