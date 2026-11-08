require_relative "../rails_helper"
RSpec.describe PolicyEngine do
  it "rejects unknown fields and executable strings" do
    expect {described_class.validate!({"eval" => "system('id')"})}.to raise_error(ArgumentError)
    expect {described_class.validate!({"risk_score_min" => "90"})}.to raise_error(ArgumentError)
  end
  it "combines rules with AND" do
    policy = Struct.new(:conditions).new({"risk_score_min" => 70, "new_device" => true})
    assessment = Struct.new(:risk_score, :data).new(80, {"transaction" => {"new_device" => true}})
    expect(described_class.matches?(policy, assessment)).to be true
    assessment.risk_score = 20
    expect(described_class.matches?(policy, assessment)).to be false
  end
end
