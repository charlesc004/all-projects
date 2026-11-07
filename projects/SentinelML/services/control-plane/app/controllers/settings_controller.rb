class SettingsController < ApplicationController
  def show
    render json: {profile: current_user.dto, users: scoped(User).order(:name).map(&:dto), retention_days: current_user.organization.retention_days,
      integrations: [{name: "Transaction ingestion", endpoint: "/ingest/v1/transactions", authentication: "Bearer API key", idempotency: "Idempotency-Key required"}]}
  end
end
