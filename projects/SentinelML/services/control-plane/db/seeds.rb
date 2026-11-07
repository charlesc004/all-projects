raise "Demo seeding requires DEMO_ENABLED=true" unless ENV["DEMO_ENABLED"] == "true"
organization = Organization.find_or_create_by!(id: "11111111-1111-4111-8111-111111111111") { |row| row.name = "Northstar Financial" }
[["admin", "Morgan Reed"], ["analyst", "Alex Carter"], ["analyst", "Jordan Ellis"], ["risk_manager", "Taylor Brooks"], ["viewer", "Casey Blake"], ["viewer", "Avery Lane"]].each_with_index do |(role, name), index|
  email = index == 0 ? "admin@sentinelml.example" : "#{name.downcase.tr(' ', '.')}@sentinelml.example"
  User.find_or_create_by!(email: email) { |user| user.organization = organization; user.name = name; user.role = role; user.password = ENV.fetch("DEMO_PASSWORD") }
end
[{name: "Critical risk review", conditions: {risk_score_min: 90}, severity: "critical", priority: 1},
 {name: "Elevated velocity", conditions: {risk_score_min: 60, velocity_hour_min: 6}, severity: "high", priority: 2},
 {name: "New device review", conditions: {risk_score_min: 50, amount_min: 1000, new_device: true}, severity: "medium", priority: 3}].each do |attributes|
  RiskPolicy.find_or_create_by!(organization: organization, name: attributes[:name]) { |policy| policy.assign_attributes(attributes) }
end
metadata = JSON.parse(File.read(File.join(ENV.fetch("MODEL_DIR", "../../ml/artifacts/v1"), "metadata.json")))
ModelVersion.find_or_create_by!(version: metadata.fetch("model_version")) { |model| model.metadata = metadata; model.active = true }
AuditEvent.find_or_create_by!(organization: organization, action: "demo.seeded", resource_type: "Organization", resource_id: organization.id)
