class NotificationsController < ApplicationController
  def index
    relation = scoped(Notification).where(user_id: current_user.id)
    render json: page(relation.order(created_at: :desc, id: :desc)).merge(unread: relation.where(read_at: nil).count)
  end
  def update
    notification = scoped(Notification).where(user_id: current_user.id).find(params[:id])
    notification.update!(read_at: Time.current)
    render json: notification.dto
  end
end
