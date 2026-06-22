-- Database Security Hardening
-- Enable encryption at rest (requires Postgres configuration)
-- Row Level Security for policies_index

ALTER TABLE policies_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_can_view_own_policies ON policies_index
    FOR SELECT
    USING (owner = current_user);

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;