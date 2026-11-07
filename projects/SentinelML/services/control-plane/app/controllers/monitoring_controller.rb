class MonitoringController < ApplicationController
  def show
    data = ModelMonitor.call(current_user.organization)
    data[:operational] = OperationalMetrics.call if %w[admin risk_manager].include?(current_user.role)
    render json: data
  end
end
