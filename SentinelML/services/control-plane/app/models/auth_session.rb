class AuthSession < ApplicationRecord
  belongs_to :user
  scope :valid_now, -> {where(revoked_at: nil).where("expires_at > ?", Time.current)}
  def self.issue!(user)
    token = SecureRandom.hex(32)
    record = create!(user: user, token_digest: Digest::SHA256.hexdigest(token), expires_at: 8.hours.from_now)
    [record, token]
  end
end
