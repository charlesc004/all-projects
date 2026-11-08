class MemberManagement
  def self.update!(user, attributes, actor)
    User.transaction do
      Organization.lock.find(actor.organization_id)
      user.assign_attributes(attributes.except("disabled"))
      user.disabled_at = ActiveModel::Type::Boolean.new.cast(attributes["disabled"]) ? Time.current : nil if attributes.key?("disabled")
      if user.role != "admin" || user.disabled_at.present?
        remaining = User.where(organization_id: actor.organization_id, role: "admin", disabled_at: nil).where.not(id: user.id).exists?
        raise ArgumentError, "the organization must retain an active administrator" unless remaining
      end
      user.save!
      AuthSession.where(user_id: user.id).update_all(revoked_at: Time.current) if user.disabled_at.present? || attributes.key?("role") || attributes.key?("password")
      AuditEvent.record!(user, "user.updated", actor: actor, metadata: attributes.except("password"))
      user
    end
  end
end
