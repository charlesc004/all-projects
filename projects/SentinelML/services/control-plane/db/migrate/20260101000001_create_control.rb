class CreateControl < ActiveRecord::Migration[8.0]
  def change
    enable_extension "pgcrypto"
    create_table :organizations, id: :uuid do |t|
      t.string :name, null: false
      t.integer :retention_days, default: 90, null: false
      t.timestamps
    end
    create_table :users, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.string :email, null: false
      t.string :name, null: false
      t.string :password_digest, null: false
      t.string :role, null: false
      t.timestamps
    end
    add_index :users, :email, unique: true
    add_check_constraint :users, "role IN ('admin','analyst','risk_manager','viewer')", name: "valid_role"
    create_table :assessments, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.uuid :transaction_id, null: false
      t.uuid :source_event_id, null: false
      t.jsonb :data, null: false
      t.integer :risk_score, null: false
      t.string :risk_level, null: false
      t.string :model_version, null: false
      t.timestamps
    end
    add_index :assessments, [:organization_id, :transaction_id], unique: true
    add_index :assessments, :source_event_id, unique: true
    add_index :assessments, [:organization_id, :created_at, :id]
    add_check_constraint :assessments, "risk_score BETWEEN 0 AND 100", name: "valid_score"
    create_table :risk_policies, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.string :name, null: false
      t.jsonb :conditions, null: false, default: {}
      t.string :severity, null: false
      t.boolean :enabled, null: false, default: true
      t.boolean :open_case, null: false, default: true
      t.integer :priority, null: false, default: 10
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    create_table :alerts, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.references :assessment, type: :uuid, null: false, foreign_key: true
      t.references :risk_policy, type: :uuid, null: false, foreign_key: true
      t.string :severity, null: false
      t.string :status, null: false, default: "new"
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    add_index :alerts, [:assessment_id, :risk_policy_id], unique: true
    add_index :alerts, [:organization_id, :created_at, :id]
    create_table :fraud_cases, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.references :alert, type: :uuid, null: false, foreign_key: true, index: {unique: true}
      t.references :assigned_user, type: :uuid, foreign_key: {to_table: :users}
      t.string :status, null: false, default: "new"
      t.string :outcome
      t.jsonb :notes, null: false, default: []
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    create_table :analyst_feedbacks, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.references :fraud_case, type: :uuid, null: false, foreign_key: true
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :outcome, null: false
      t.jsonb :features, null: false
      t.timestamps
    end
    create_table :audit_events, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.uuid :actor_id
      t.string :action, null: false
      t.string :resource_type, null: false
      t.uuid :resource_id, null: false
      t.jsonb :metadata, null: false, default: {}
      t.timestamps
    end
    add_index :audit_events, [:organization_id, :created_at, :id]
    create_table :model_versions, id: :uuid do |t|
      t.string :version, null: false, index: {unique: true}
      t.jsonb :metadata, null: false
      t.boolean :active, null: false, default: false
      t.timestamps
    end
    create_table :control_outboxes, id: :uuid do |t|
      t.string :topic, null: false
      t.jsonb :event, null: false
      t.datetime :published_at
      t.timestamps
    end
    add_index :control_outboxes, :published_at
  end
end
