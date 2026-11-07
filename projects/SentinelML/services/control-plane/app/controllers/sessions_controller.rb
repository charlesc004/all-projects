class SessionsController < ApplicationController
  skip_before_action :authenticate!, only: [:show, :create, :demo]
  def show
    render json: {user: current_user&.dto, csrf_token: form_authenticity_token, demo_enabled: ENV["DEMO_ENABLED"] == "true"}
  end
  def demo
    return head :not_found unless ENV["DEMO_ENABLED"] == "true"
    user = User.find_by(email: "admin@sentinelml.example", organization_id: "11111111-1111-4111-8111-111111111111")
    password = ENV["DEMO_PASSWORD"]
    return render json: {error: "demo account is unavailable"}, status: :service_unavailable unless user && password.present?
    # Use the normal password, disabled-account checks, rate limit and session rotation.
    params[:email], params[:password] = user.email, password
    create
  end
  def create
    # Redis-backed attempt limit shared by all web replicas; fail closed on Redis outage.
    redis = Redis.new(url: ENV.fetch("REDIS_URL"))
    key = "login:#{Digest::SHA256.hexdigest(request.remote_ip)}:#{Time.current.to_i / 60}"
    count = redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],65) end; return n", keys: [key])
    return render json: {error: "too many login attempts"}, status: :too_many_requests if count > 10
    user = User.find_by(email: params.require(:email).to_s.downcase.strip)
    if user && user.disabled_at.nil? && user.authenticate(params.require(:password))
      reset_session
      auth, token = AuthSession.issue!(user)
      session[:auth_session_id], session[:auth_token] = auth.id, token
      render json: {user: user.dto, csrf_token: form_authenticity_token}
    else
      BCrypt::Password.create("constant-work-invalid-login") unless user
      render json: {error: "invalid email or password"}, status: :unauthorized
    end
  ensure
    redis&.close
  end
  def destroy
    AuthSession.where(id: session[:auth_session_id], user_id: current_user.id).update_all(revoked_at: Time.current)
    reset_session
    head :no_content
  end
end
