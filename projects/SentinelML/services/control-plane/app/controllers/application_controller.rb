class ApplicationController < ActionController::Base
  include Pundit::Authorization
  protect_from_forgery with: :exception
  before_action :authenticate!
  rescue_from Pundit::NotAuthorizedError do
    render json: {error: "permission denied"}, status: :forbidden
  end
  rescue_from ActionController::InvalidAuthenticityToken do
    render json: {error: "session verification expired; refresh and try again"}, status: :forbidden
  end
  rescue_from ActiveRecord::RecordNotFound do
    render json: {error: "resource not found"}, status: :not_found
  end
  rescue_from ActiveRecord::StaleObjectError do
    render json: {error: "record changed; refresh and try again"}, status: :conflict
  end
  rescue_from ServiceClient::Unavailable do
    render json: {error: "dependent service unavailable; try again shortly"}, status: :service_unavailable
  end
  rescue_from ActiveRecord::RecordInvalid, ArgumentError, ActionController::ParameterMissing do |error|
    render json: {error: error.message}, status: :unprocessable_entity
  end
  def current_user
    return @current_user if defined?(@current_user)
    auth = AuthSession.valid_now.find_by(id: session[:auth_session_id])
    valid = auth && session[:auth_token].present? && ActiveSupport::SecurityUtils.secure_compare(auth.token_digest, Digest::SHA256.hexdigest(session[:auth_token]))
    @current_user = valid && auth.user.disabled_at.nil? ? auth.user : nil
  end
  def require_admin!
    raise Pundit::NotAuthorizedError unless current_user.role == "admin"
  end
  def require_risk_manager!
    raise Pundit::NotAuthorizedError unless %w[admin risk_manager].include?(current_user.role)
  end
  helper_method :current_user
  def authenticate!
    render json: {error: "authentication required"}, status: :unauthorized unless current_user
  end
  def scoped(model)
    model.where(organization_id: current_user.organization_id)
  end
  def page(relation)
    size = params.fetch(:per_page, 20).to_i.clamp(1, 100)
    number = params.fetch(:page, 1).to_i.clamp(1, 100_000)
    {items: relation.offset((number - 1) * size).limit(size).map(&:dto), total: relation.count, page: number, per_page: size}
  end
end
