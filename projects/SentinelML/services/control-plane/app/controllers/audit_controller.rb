class AuditController < ApplicationController
  def index
    render json: page(scoped(AuditEvent).order(created_at: :desc, id: :desc))
  end
end
