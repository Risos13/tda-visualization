-- PostgreSQL initialization script for XK-Fi TDA Platform
-- This script sets up the database schema for production data logging

-- Create database if not exists (handled by Docker environment)
-- CREATE DATABASE IF NOT EXISTS xkfi_tda;

-- Use the database
\c xkfi_tda;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS sensor_data;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Sensor data tables
CREATE TABLE sensor_data.vehicle_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    session_name VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    total_duration INTERVAL,
    total_data_points INTEGER DEFAULT 0,
    anomaly_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sensor_data.sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES sensor_data.vehicle_sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    speed DECIMAL(8,2) NOT NULL,
    acceleration DECIMAL(8,4) NOT NULL,
    wheel_slip DECIMAL(5,2) NOT NULL,
    engine_rpm INTEGER NOT NULL,
    brake_force DECIMAL(5,2) NOT NULL,
    steering_angle DECIMAL(6,2) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    fuel_level DECIMAL(5,2) NOT NULL,
    anomaly_score DECIMAL(5,4) DEFAULT 0,
    is_anomaly BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TDA computation results
CREATE TABLE sensor_data.tda_computations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sensor_data.vehicle_sessions(id) ON DELETE CASCADE,
    computation_type VARCHAR(50) NOT NULL, -- 'static', 'streaming', 'window'
    algorithm VARCHAR(50) NOT NULL, -- 'simple', 'gudhi', 'ripser'
    parameters JSONB,
    persistence_diagram JSONB,
    barcodes JSONB,
    computation_time_ms INTEGER,
    data_points_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics tables
CREATE TABLE analytics.user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics.system_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit tables
CREATE TABLE audit.api_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    request_size INTEGER,
    response_size INTEGER,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sensor_readings_session_timestamp ON sensor_data.sensor_readings(session_id, timestamp);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_data.sensor_readings(timestamp);
CREATE INDEX idx_sensor_readings_anomaly ON sensor_data.sensor_readings(is_anomaly) WHERE is_anomaly = TRUE;
CREATE INDEX idx_vehicle_sessions_user_time ON sensor_data.vehicle_sessions(user_id, start_time);
CREATE INDEX idx_tda_computations_session ON sensor_data.tda_computations(session_id);
CREATE INDEX idx_user_activity_user_time ON analytics.user_activity(user_id, timestamp);
CREATE INDEX idx_system_metrics_name_time ON analytics.system_metrics(metric_name, timestamp);
CREATE INDEX idx_api_requests_user_time ON audit.api_requests(user_id, timestamp);

-- Partitioning for large tables (by month)
-- This will help with performance as data grows
CREATE TABLE sensor_data.sensor_readings_template (LIKE sensor_data.sensor_readings INCLUDING ALL);

-- Create trigger for automatic updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicle_sessions_updated_at 
    BEFORE UPDATE ON sensor_data.vehicle_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW analytics.daily_user_stats AS
SELECT 
    DATE(timestamp) as date,
    user_id,
    COUNT(*) as total_actions,
    COUNT(DISTINCT action) as unique_actions,
    MIN(timestamp) as first_action,
    MAX(timestamp) as last_action
FROM analytics.user_activity
GROUP BY DATE(timestamp), user_id;

CREATE VIEW sensor_data.session_summary AS
SELECT 
    vs.id,
    vs.user_id,
    vs.session_name,
    vs.start_time,
    vs.end_time,
    vs.total_duration,
    vs.total_data_points,
    vs.anomaly_count,
    COALESCE(AVG(sr.speed), 0) as avg_speed,
    COALESCE(MAX(sr.speed), 0) as max_speed,
    COALESCE(AVG(sr.anomaly_score), 0) as avg_anomaly_score,
    COALESCE(MAX(sr.anomaly_score), 0) as max_anomaly_score,
    COUNT(tc.id) as tda_computation_count
FROM sensor_data.vehicle_sessions vs
LEFT JOIN sensor_data.sensor_readings sr ON vs.id = sr.session_id
LEFT JOIN sensor_data.tda_computations tc ON vs.id = tc.session_id
GROUP BY vs.id, vs.user_id, vs.session_name, vs.start_time, vs.end_time, vs.total_duration, vs.total_data_points, vs.anomaly_count;

-- Functions for data management
CREATE OR REPLACE FUNCTION sensor_data.cleanup_old_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old sensor readings
    DELETE FROM sensor_data.sensor_readings 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete sessions with no readings
    DELETE FROM sensor_data.vehicle_sessions 
    WHERE id NOT IN (SELECT DISTINCT session_id FROM sensor_data.sensor_readings WHERE session_id IS NOT NULL);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO sensor_data.vehicle_sessions (user_id, session_name) 
VALUES ('test-user-1', 'Sample Test Session');

-- Grant permissions (adjust as needed for production)
GRANT USAGE ON SCHEMA sensor_data TO xkfi_user;
GRANT USAGE ON SCHEMA analytics TO xkfi_user;
GRANT USAGE ON SCHEMA audit TO xkfi_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sensor_data TO xkfi_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO xkfi_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO xkfi_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sensor_data TO xkfi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA analytics TO xkfi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO xkfi_user;
