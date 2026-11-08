require_relative "../rails_helper"
RSpec.describe ApplicationPolicy do
  it "allows viewers to read and prevents mutations" do
    user = User.new(role: "viewer")
    policy = described_class.new(user, nil)
    expect(policy.index?).to be true
    expect(policy.update?).to be false
    expect(policy.create?).to be false
  end
end
