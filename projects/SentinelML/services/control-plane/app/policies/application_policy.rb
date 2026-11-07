class ApplicationPolicy
  attr_reader :user, :record
  def initialize(user, record)
    @user, @record = user, record
  end
  def index? = user.present?
  def show? = user.present?
  def create? = %w[admin risk_manager].include?(user.role)
  def update? = %w[admin analyst risk_manager].include?(user.role)
end
