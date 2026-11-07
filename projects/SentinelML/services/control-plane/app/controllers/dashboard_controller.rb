class DashboardController < ApplicationController
  def show
    assessments, alerts, cases = scoped(Assessment), scoped(Alert), scoped(FraudCase)
    daily = assessments.where("created_at >= ?", 14.days.ago).group("DATE(created_at AT TIME ZONE 'UTC')").count
    flagged = assessments.where("risk_score >= 70").group("DATE(created_at AT TIME ZONE 'UTC')").count
    trend = (13.days.ago.to_date..Time.current.to_date).map { |date| {date: date.iso8601, transactions: daily[date] || 0, high_risk: flagged[date] || 0} }
    model = ModelRegistry.active_for(current_user.organization)
    render json: {transactions: assessments.count, alerts: alerts.count, high_risk: assessments.where("risk_score >= 70").count,
      open_cases: cases.where.not(status: %w[resolved dismissed]).count, trend: trend,
      risk_distribution: assessments.group(:risk_level).count.map { |name, value| {name: name, value: value} },
      recent_alerts: alerts.includes(:assessment, :risk_policy, :fraud_case).order(created_at: :desc).limit(5).map(&:dto),
      recent_cases: cases.includes(:assigned_user, alert: [:assessment, :risk_policy]).order(created_at: :desc).limit(5).map(&:dto),
      high_risk_transactions: assessments.where("risk_score >= 70").order(created_at: :desc).limit(5).map(&:dto),
      top_indicators: assessments.order(created_at: :desc).limit(5000).pluck(:data).flat_map { |row| row.fetch("risk_indicators", []) }.tally.sort_by { |_, count| -count }.first(5).map { |name, count| {name: name, count: count} },
      model: model&.dto, observed_at: Time.current.iso8601}
  end
end
