class PolicyEngine
  FIELDS = {"risk_score_min" => 0..100, "amount_min" => 0..10_000_000, "velocity_hour_min" => 0..100_000,
    "new_device" => [true, false], "country_mismatch" => [true, false]}.freeze
  def self.validate!(conditions)
    raise ArgumentError, "conditions must be a nonempty object" unless conditions.is_a?(Hash) && conditions.any?
    conditions.each do |key, value|
      bounds = FIELDS[key]
      raise ArgumentError, "invalid rule #{key}" unless bounds
      valid = bounds.is_a?(Range) ? value.is_a?(Numeric) && value.finite? && bounds.cover?(value) : bounds.include?(value)
      raise ArgumentError, "invalid value for #{key}" unless valid
    end
  end
  def self.matches?(policy, assessment)
    validate!(policy.conditions)
    transaction = assessment.data.fetch("transaction")
    policy.conditions.all? do |key, value|
      case key
      when "risk_score_min" then assessment.risk_score >= value
      when "amount_min" then transaction.fetch("amount") >= value
      when "velocity_hour_min" then transaction.fetch("velocity_hour") >= value
      else transaction.fetch(key) == value
      end
    end
  end
end
