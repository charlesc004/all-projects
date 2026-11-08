class RiskPolicyPolicy < ApplicationPolicy
  def update? = create?
end
