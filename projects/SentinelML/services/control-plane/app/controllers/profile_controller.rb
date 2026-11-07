class ProfileController < ApplicationController
  def update
    attributes = params.permit(:name, :email, :password, notification_preferences: [:alerts]).to_h
    if attributes.key?("password") || attributes.key?("email")
      raise ArgumentError, "current password is required" unless current_user.authenticate(params[:current_password].to_s)
    end
    User.transaction do
      current_user.update!(attributes)
      if attributes.key?("password")
        AuthSession.where(user_id: current_user.id).update_all(revoked_at: Time.current)
        auth, token = AuthSession.issue!(current_user)
        reset_session
        session[:auth_session_id], session[:auth_token] = auth.id, token
      end
      AuditEvent.record!(current_user, "profile.updated", actor: current_user, metadata: {fields: attributes.keys})
    end
    render json: {user: current_user.dto, csrf_token: form_authenticity_token}
  end
end
