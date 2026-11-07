class CompleteOperations < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :disabled_at, :datetime
    add_column :users, :notification_preferences, :jsonb, default: {alerts: true}, null: false
    create_table :auth_sessions, id: :uuid do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :revoked_at
      t.timestamps
    end
    add_index :auth_sessions, :expires_at
    create_table :notifications, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.references :alert, type: :uuid, foreign_key: true
      t.string :title, null: false
      t.string :message, null: false
      t.datetime :read_at
      t.timestamps
    end
    add_index :notifications, [:user_id, :created_at]
    add_index :notifications, [:user_id, :alert_id], unique: true
    create_table :policy_executions, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.references :risk_policy, type: :uuid, null: false, foreign_key: true
      t.references :assessment, type: :uuid, null: false, foreign_key: true
      t.boolean :matched, null: false
      t.jsonb :conditions, null: false
      t.timestamps
    end
    add_index :policy_executions, [:risk_policy_id, :assessment_id], unique: true
    create_table :model_deployments, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true, index: {unique: true}
      t.references :model_version, type: :uuid, null: false, foreign_key: true
      t.uuid :source_event_id, null: false
      t.datetime :activated_at, null: false
      t.timestamps
    end
    add_index :model_deployments, :source_event_id, unique: true
    add_check_constraint :organizations, "retention_days BETWEEN 7 AND 3650", name: "retention_bounds"
  end
end
