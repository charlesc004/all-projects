class Notification < ApplicationRecord
  belongs_to :organization
  belongs_to :user
  belongs_to :alert, optional: true
  def dto
    {id: id, title: title, message: message, alert_id: alert_id, read_at: read_at&.iso8601, created_at: created_at.iso8601}
  end
end
