require_relative "boot"
require "rails"
require "active_record/railtie"
require "action_controller/railtie"
require "active_job/railtie"
require "rails/test_unit/railtie"
Bundler.require(*Rails.groups)

module SentinelControl
  class Application < Rails::Application
    config.load_defaults 8.0
    config.time_zone = "UTC"
    config.active_record.default_timezone = :utc
    config.active_job.queue_adapter = :sidekiq
    config.secret_key_base = ENV.fetch("SECRET_KEY_BASE")
    config.hosts = ["localhost", "127.0.0.1", "control", "test.host"] + ENV.fetch("ALLOWED_HOSTS", "").split(",").reject(&:empty?)
    config.session_store :cookie_store, key: "_sentinel_session", httponly: true,
      same_site: :lax, secure: ENV["SECURE_COOKIES"] == "true", expire_after: 8.hours
    config.logger = ActiveSupport::Logger.new($stdout)
    config.log_formatter = proc { |severity, time, _, message| {severity: severity, timestamp: time.utc.iso8601, service: "control", message: message}.to_json + "\n" }
    config.logger.formatter = config.log_formatter
    config.log_level = ENV.fetch("LOG_LEVEL", "info")
    config.colorize_logging = false
    config.filter_parameters += [:password, :password_confirmation, :token, :api_key, :authorization]
    config.eager_load = ENV["RAILS_ENV"] == "production"
  end
end
