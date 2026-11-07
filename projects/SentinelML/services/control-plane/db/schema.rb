# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_01_01_000002) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "alerts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "assessment_id", null: false
    t.uuid "risk_policy_id", null: false
    t.string "severity", null: false
    t.string "status", default: "new", null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["assessment_id", "risk_policy_id"], name: "index_alerts_on_assessment_id_and_risk_policy_id", unique: true
    t.index ["assessment_id"], name: "index_alerts_on_assessment_id"
    t.index ["organization_id", "created_at", "id"], name: "index_alerts_on_organization_id_and_created_at_and_id"
    t.index ["organization_id"], name: "index_alerts_on_organization_id"
    t.index ["risk_policy_id"], name: "index_alerts_on_risk_policy_id"
  end

  create_table "analyst_feedbacks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "fraud_case_id", null: false
    t.uuid "user_id", null: false
    t.string "outcome", null: false
    t.jsonb "features", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["fraud_case_id"], name: "index_analyst_feedbacks_on_fraud_case_id"
    t.index ["organization_id"], name: "index_analyst_feedbacks_on_organization_id"
    t.index ["user_id"], name: "index_analyst_feedbacks_on_user_id"
  end

  create_table "assessments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "transaction_id", null: false
    t.uuid "source_event_id", null: false
    t.jsonb "data", null: false
    t.integer "risk_score", null: false
    t.string "risk_level", null: false
    t.string "model_version", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "created_at", "id"], name: "index_assessments_on_organization_id_and_created_at_and_id"
    t.index ["organization_id", "transaction_id"], name: "index_assessments_on_organization_id_and_transaction_id", unique: true
    t.index ["organization_id"], name: "index_assessments_on_organization_id"
    t.index ["source_event_id"], name: "index_assessments_on_source_event_id", unique: true
    t.check_constraint "risk_score >= 0 AND risk_score <= 100", name: "valid_score"
  end

  create_table "audit_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "actor_id"
    t.string "action", null: false
    t.string "resource_type", null: false
    t.uuid "resource_id", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "created_at", "id"], name: "index_audit_events_on_organization_id_and_created_at_and_id"
    t.index ["organization_id"], name: "index_audit_events_on_organization_id"
  end

  create_table "auth_sessions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "token_digest", null: false
    t.datetime "expires_at", null: false
    t.datetime "revoked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_auth_sessions_on_expires_at"
    t.index ["user_id"], name: "index_auth_sessions_on_user_id"
  end

  create_table "control_outboxes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "topic", null: false
    t.jsonb "event", null: false
    t.datetime "published_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["published_at"], name: "index_control_outboxes_on_published_at"
  end

  create_table "fraud_cases", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "alert_id", null: false
    t.uuid "assigned_user_id"
    t.string "status", default: "new", null: false
    t.string "outcome"
    t.jsonb "notes", default: [], null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["alert_id"], name: "index_fraud_cases_on_alert_id", unique: true
    t.index ["assigned_user_id"], name: "index_fraud_cases_on_assigned_user_id"
    t.index ["organization_id"], name: "index_fraud_cases_on_organization_id"
  end

  create_table "model_deployments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "model_version_id", null: false
    t.uuid "source_event_id", null: false
    t.datetime "activated_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["model_version_id"], name: "index_model_deployments_on_model_version_id"
    t.index ["organization_id"], name: "index_model_deployments_on_organization_id", unique: true
    t.index ["source_event_id"], name: "index_model_deployments_on_source_event_id", unique: true
  end

  create_table "model_versions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "version", null: false
    t.jsonb "metadata", null: false
    t.boolean "active", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["version"], name: "index_model_versions_on_version", unique: true
  end

  create_table "notifications", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "user_id", null: false
    t.uuid "alert_id"
    t.string "title", null: false
    t.string "message", null: false
    t.datetime "read_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["alert_id"], name: "index_notifications_on_alert_id"
    t.index ["organization_id"], name: "index_notifications_on_organization_id"
    t.index ["user_id", "alert_id"], name: "index_notifications_on_user_id_and_alert_id", unique: true
    t.index ["user_id", "created_at"], name: "index_notifications_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "organizations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.integer "retention_days", default: 90, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.check_constraint "retention_days >= 7 AND retention_days <= 3650", name: "retention_bounds"
  end

  create_table "policy_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "risk_policy_id", null: false
    t.uuid "assessment_id", null: false
    t.boolean "matched", null: false
    t.jsonb "conditions", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["assessment_id"], name: "index_policy_executions_on_assessment_id"
    t.index ["organization_id"], name: "index_policy_executions_on_organization_id"
    t.index ["risk_policy_id", "assessment_id"], name: "index_policy_executions_on_risk_policy_id_and_assessment_id", unique: true
    t.index ["risk_policy_id"], name: "index_policy_executions_on_risk_policy_id"
  end

  create_table "risk_policies", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.string "name", null: false
    t.jsonb "conditions", default: {}, null: false
    t.string "severity", null: false
    t.boolean "enabled", default: true, null: false
    t.boolean "open_case", default: true, null: false
    t.integer "priority", default: 10, null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_risk_policies_on_organization_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.string "email", null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.string "role", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "disabled_at"
    t.jsonb "notification_preferences", default: {"alerts"=>true}, null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["organization_id"], name: "index_users_on_organization_id"
    t.check_constraint "role::text = ANY (ARRAY['admin'::character varying, 'analyst'::character varying, 'risk_manager'::character varying, 'viewer'::character varying]::text[])", name: "valid_role"
  end

  add_foreign_key "alerts", "assessments"
  add_foreign_key "alerts", "organizations"
  add_foreign_key "alerts", "risk_policies"
  add_foreign_key "analyst_feedbacks", "fraud_cases"
  add_foreign_key "analyst_feedbacks", "organizations"
  add_foreign_key "analyst_feedbacks", "users"
  add_foreign_key "assessments", "organizations"
  add_foreign_key "audit_events", "organizations"
  add_foreign_key "auth_sessions", "users"
  add_foreign_key "fraud_cases", "alerts"
  add_foreign_key "fraud_cases", "organizations"
  add_foreign_key "fraud_cases", "users", column: "assigned_user_id"
  add_foreign_key "model_deployments", "model_versions"
  add_foreign_key "model_deployments", "organizations"
  add_foreign_key "notifications", "alerts"
  add_foreign_key "notifications", "organizations"
  add_foreign_key "notifications", "users"
  add_foreign_key "policy_executions", "assessments"
  add_foreign_key "policy_executions", "organizations"
  add_foreign_key "policy_executions", "risk_policies"
  add_foreign_key "risk_policies", "organizations"
  add_foreign_key "users", "organizations"
end
