require "csv"
class ReportsController < ApplicationController
  def show
    from = params[:from].present? ? Time.iso8601(params[:from]) : 30.days.ago
    to = params[:to].present? ? Time.iso8601(params[:to]) : Time.current
    raise ArgumentError, "report interval must be positive and at most 366 days" unless to > from && to - from <= 366.days
    rows = scoped(Assessment).where(created_at: from..to).order(created_at: :desc).limit(10_001).to_a
    raise ArgumentError, "report exceeds 10000 rows; select a smaller interval" if rows.length > 10_000
    content = CSV.generate do |csv|
      csv << %w[transaction_id scored_at merchant amount currency risk_score risk_level model_version fraud_probability]
      rows.each do |row|
        transaction = row.data.fetch("transaction")
        # Neutralize spreadsheet formulas in untrusted merchant text.
        merchant = transaction.fetch("merchant").to_s.sub(/\A([=+@\-\t\r])/, "'\\1")
        csv << [row.transaction_id, row.created_at.iso8601, merchant, transaction["amount"], transaction["currency"], row.risk_score, row.risk_level, row.model_version, row.data["fraud_probability"]]
      end
    end
    AuditEvent.record!(current_user.organization, "report.exported", actor: current_user, metadata: {rows: rows.length, from: from.iso8601, to: to.iso8601})
    send_data content, filename: "sentinelml-risk-report.csv", type: "text/csv"
  end
end
