class CaseWorkflow
  def self.update!(record, attributes, actor)
    record.transaction do
      Organization.lock.find(actor.organization_id)
      record.assign_attributes(attributes.except("note"))
      if attributes["assigned_user_id"].present?
        User.where(organization_id: actor.organization_id, role: %w[admin analyst risk_manager], disabled_at: nil).find(attributes["assigned_user_id"])
      end
      if attributes["note"].present?
        raise ArgumentError, "note must be at most 4000 characters" if attributes["note"].length > 4000
        record.notes = record.notes + [{id: SecureRandom.uuid, author: actor.name, text: attributes["note"], at: Time.current.iso8601}]
      end
      if attributes["outcome"].present?
        raise ArgumentError, "resolve the case when recording an outcome" unless record.status == "resolved"
      end
      record.save!
      record.alert.update!(status: record.status)
      if attributes["outcome"].present?
        AnalystFeedback.create!(organization_id: actor.organization_id, fraud_case: record, user: actor,
          outcome: record.outcome, features: record.alert.assessment.data.fetch("features"))
      end
      AuditEvent.record!(record, "case.updated", actor: actor, metadata: attributes.except("note"))
      ControlOutbox.emit!("fraud.case.updated.v1", record, {case_id: record.id, status: record.status, lock_version: record.lock_version}, transaction_id: record.alert.assessment.transaction_id)
      record
    end
  end
end
