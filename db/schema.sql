-- ClimaFi Database Schema (Postgres + TimescaleDB)
-- Exact schema from design doc §8

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Regions
CREATE TABLE regions (
    region_id TEXT PRIMARY KEY,
    region_id_u64 BIGINT UNIQUE NOT NULL,
    name TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    bounds_json JSONB,
    risk_tier SMALLINT CHECK (risk_tier BETWEEN 1 AND 5),
    active BOOLEAN DEFAULT true
);

-- Raw oracle readings (hypertable)
CREATE TABLE oracle_readings (
    time TIMESTAMPTZ NOT NULL,
    region_id TEXT NOT NULL,
    source TEXT NOT NULL,
    rain_mm_x100 INTEGER NOT NULL,
    confidence REAL,
    PRIMARY KEY (time, region_id, source)
);

SELECT create_hypertable('oracle_readings', 'time');

CREATE INDEX idx_oracle_readings_region_time ON oracle_readings(region_id, time DESC);
CREATE INDEX idx_oracle_readings_source_time ON oracle_readings(source, time DESC);

-- Daily aggregates
CREATE TABLE oracle_daily_aggregates (
    day_start_utc TIMESTAMPTZ NOT NULL,
    region_id TEXT NOT NULL,
    rain_mm_x100 INTEGER NOT NULL,
    sources_bitmap INTEGER NOT NULL,
    agg_method SMALLINT NOT NULL,
    UNIQUE(region_id, day_start_utc)
);

-- Quotes (for audit)
CREATE TABLE quotes (
    quote_hash BYTEA PRIMARY KEY,
    policy_id BIGINT NOT NULL,
    pool_id BIGINT NOT NULL,
    region_id_u64 BIGINT NOT NULL,
    window_start_unix BIGINT NOT NULL,
    window_end_unix BIGINT NOT NULL,
    premium_amount BIGINT NOT NULL,
    payout_amount BIGINT NOT NULL,
    expires_unix BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies index
CREATE TABLE policies_index (
    policy_id BIGINT PRIMARY KEY,
    owner TEXT NOT NULL,
    pool_id BIGINT NOT NULL,
    region_id TEXT NOT NULL,
    window_start_unix BIGINT NOT NULL,
    window_end_unix BIGINT NOT NULL,
    status TEXT NOT NULL,
    triggered BOOLEAN,
    observed_value BIGINT,
    tx_sig_purchase TEXT,
    tx_sig_settle TEXT
);