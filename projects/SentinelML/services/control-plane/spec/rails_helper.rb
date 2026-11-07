ENV["RAILS_ENV"] = "test"
require_relative "../config/environment"
require "rspec/rails"
RSpec.configure do |config|
  config.use_transactional_fixtures = true
end
