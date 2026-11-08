-- These credentials are for local synthetic demonstrations only.
-- Production must provision distinct rotated roles through a secret manager.
\getenv service_password POSTGRES_PASSWORD
CREATE ROLE ingestion LOGIN PASSWORD :'service_password';
CREATE ROLE inference LOGIN PASSWORD :'service_password';
CREATE ROLE control LOGIN PASSWORD :'service_password';
CREATE DATABASE sentinel_ingestion OWNER ingestion;
CREATE DATABASE sentinel_inference OWNER inference;
CREATE DATABASE sentinel_control OWNER control;
REVOKE ALL ON DATABASE sentinel_ingestion FROM PUBLIC;
REVOKE ALL ON DATABASE sentinel_inference FROM PUBLIC;
REVOKE ALL ON DATABASE sentinel_control FROM PUBLIC;
