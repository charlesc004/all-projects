class MembersController < ApplicationController
  before_action :require_admin!
  def create
    user = User.new(params.permit(:name, :email, :role, :password).merge(organization_id: current_user.organization_id))
    User.transaction {user.save!; AuditEvent.record!(user, "user.created", actor: current_user)}
    render json: user.dto, status: :created
  end
  def update
    user = scoped(User).find(params[:id])
    render json: MemberManagement.update!(user, params.permit(:name, :email, :role, :password, :disabled).to_h, current_user).dto
  end
end
