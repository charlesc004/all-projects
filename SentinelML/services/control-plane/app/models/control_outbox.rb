class ControlOutbox < ApplicationRecord
  def self.emit!(topic, resource, payload, transaction_id:, correlation_id: SecureRandom.uuid, trace_parent: nil)
    event = {event_id: SecureRandom.uuid, event_type: topic, schema_version: 1,
      organization_id: resource.organization_id, transaction_id: transaction_id,
      correlation_id: correlation_id, occurred_at: Time.current.iso8601(6), payload: payload}
    event[:trace_parent] = trace_parent if trace_parent.present?
    create!(topic: topic, event: event)
  end
end
