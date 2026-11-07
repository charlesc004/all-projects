class ScoringProcessor
  def self.call(event)
    schema = JSON.parse(File.read(File.join(ENV.fetch("CONTRACTS_DIR", "../../contracts"), "events/transaction.scored.v1.json")))
    raise ArgumentError, "invalid scoring event" unless JSONSchemer.schema(schema).valid?(event)
    payload = event.fetch("payload")
    transaction = payload.fetch("transaction")
    raise ArgumentError, "ownership mismatch" unless transaction.fetch("organization_id") == event.fetch("organization_id") && transaction.fetch("id") == event.fetch("transaction_id")
    Assessment.transaction do
      # Tenant lock serializes policy application and makes duplicate consumption safe.
      organization = Organization.lock.find(event.fetch("organization_id"))
      return if Assessment.exists?(organization_id: organization.id, transaction_id: event.fetch("transaction_id"))
      assessment = Assessment.create!(organization: organization, transaction_id: event.fetch("transaction_id"),
        source_event_id: event.fetch("event_id"), data: payload, risk_score: payload.fetch("risk_score"),
        risk_level: payload.fetch("risk_level"), model_version: payload.fetch("model_version"))
      RiskPolicy.where(organization_id: organization.id, enabled: true).order(:priority).each do |policy|
        matched = PolicyEngine.matches?(policy, assessment)
        PolicyExecution.create!(organization: organization, risk_policy: policy, assessment: assessment, matched: matched, conditions: policy.conditions)
        next unless matched
        alert = Alert.create!(organization: organization, assessment: assessment, risk_policy: policy, severity: policy.severity)
        FraudCase.create!(organization: organization, alert: alert) if policy.open_case
        User.where(organization_id: organization.id, role: %w[admin analyst risk_manager], disabled_at: nil).find_each do |user|
          next if user.notification_preferences["alerts"] == false
          Notification.create!(organization: organization, user: user, alert: alert, title: "#{alert.severity.capitalize} fraud alert", message: "#{policy.name}: #{transaction.fetch('merchant')}")
        end
        AuditEvent.record!(alert, "alert.created", metadata: {policy_id: policy.id, correlation_id: event["correlation_id"], trace_parent: event["trace_parent"]})
        ControlOutbox.emit!("fraud.alert.created.v1", alert, {alert_id: alert.id, severity: alert.severity}, transaction_id: assessment.transaction_id, correlation_id: event.fetch("correlation_id"), trace_parent: event["trace_parent"])
      end
      Rails.logger.info({event: "transaction.scored.consumed", organization_id: organization.id, transaction_id: assessment.transaction_id, correlation_id: event["correlation_id"], trace_parent: event["trace_parent"], model_version: assessment.model_version}.to_json)
    end
  end
end
