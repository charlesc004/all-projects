require "net/http"
class ServiceClient
  class Unavailable < StandardError; end
  def self.request(base, path, method: :get, payload: nil)
    uri = URI(ENV.fetch(base) + path)
    request_class = {get: Net::HTTP::Get, post: Net::HTTP::Post, patch: Net::HTTP::Patch}.fetch(method)
    request = request_class.new(uri, "Content-Type" => "application/json", "Authorization" => "Bearer #{ENV.fetch('INTERNAL_SERVICE_TOKEN')}")
    request.body = payload.to_json if payload
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 3, read_timeout: 15) { |http| http.request(request) }
    data = JSON.parse(response.body)
    raise ArgumentError, data.fetch("error", "service rejected request") if response.code.to_i.between?(400, 499)
    raise Unavailable, "dependent service unavailable" unless response.code.to_i.between?(200, 299)
    data
  rescue IOError, SystemCallError, Timeout::Error, JSON::ParserError
    raise Unavailable, "dependent service unavailable"
  end
end
