class RetentionJob
  include Sidekiq::Job
  def perform
    Organization.find_each do |organization|
      Organization.transaction do
      organization.lock!
      cutoff = organization.retention_days.days.ago
      protected_alerts = Alert.where(organization: organization).where("status NOT IN (?) OR updated_at >= ?", %w[resolved dismissed], cutoff).select(:assessment_id)
      protected_cases = FraudCase.where(organization: organization).where("fraud_cases.status NOT IN (?) OR fraud_cases.updated_at >= ?", %w[resolved dismissed], cutoff).joins(:alert).select("alerts.assessment_id")
      rows = Assessment.where(organization: organization).where("created_at < ?", cutoff).where.not(id: protected_alerts).where.not(id: protected_cases).order(:created_at).limit(200).to_a
      next if rows.empty?
      payload = {before: cutoff.utc.iso8601, transaction_ids: rows.map(&:transaction_id)}
      ServiceClient.request("INGESTION_URL", "/internal/organizations/#{organization.id}/retention", method: :post, payload: payload)
      ServiceClient.request("INFERENCE_URL", "/internal/organizations/#{organization.id}/retention", method: :post, payload: payload)
      Assessment.transaction do
        ids = rows.map(&:id)
        alerts = Alert.where(assessment_id: ids)
        cases = FraudCase.where(alert_id: alerts.select(:id))
        AnalystFeedback.where(fraud_case_id: cases.select(:id)).delete_all
        Notification.where(alert_id: alerts.select(:id)).delete_all
        cases.delete_all
        alerts.delete_all
        PolicyExecution.where(assessment_id: ids).delete_all
        Assessment.where(id: ids).delete_all
        AuditEvent.record!(organization, "retention.completed", metadata: {count: ids.length, before: cutoff.utc.iso8601})
      end
      end
    end
    AuthSession.where("expires_at < ?", 1.day.ago).delete_all
  end
end
