Rails.application.configure do
  config.eager_load = false
  config.action_controller.allow_forgery_protection = false
  config.hosts << "www.example.com"
end
