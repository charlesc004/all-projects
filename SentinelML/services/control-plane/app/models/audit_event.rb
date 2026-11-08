class AuditEvent < ApplicationRecord
  belongs_to :organization
  def self.record!(resource, action, actor: nil, metadata: {})
    create!(organization_id: resource.is_a?(Organization) ? resource.id : resource.organization_id, actor_id: actor&.id, action: action,
      resource_type: resource.class.name, resource_id: resource.id, metadata: metadata)
  end
  def dto
    attributes.slice("id", "actor_id", "action", "resource_type", "resource_id", "metadata", "created_at")
  end
end
