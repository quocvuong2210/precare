-- PreCare Database Initialization Script
-- PostgreSQL 16 DDL for 11 Core Tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Bảng Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'pregnant_woman', 'admin')),
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id UUID NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_table, target_id);

-- 3. Bảng Pregnancy Profiles
CREATE TABLE IF NOT EXISTS pregnancy_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    primary_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lmp DATE,
    q1_ultrasound_date DATE,
    q1_gestational_weeks INT,
    q1_gestational_days INT,
    edd DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_patient ON pregnancy_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_doctor ON pregnancy_profiles(primary_doctor_id);

-- 4. Bảng Checkups
CREATE TABLE IF NOT EXISTS checkups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id),
    checkup_date DATE NOT NULL,
    gestational_age_days INT NOT NULL,
    weight_kg NUMERIC(5,2),
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_checkups_profile ON checkups(pregnancy_profile_id);

-- 5. Bảng Uploaded Files
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    checkup_id UUID REFERENCES checkups(id) ON DELETE SET NULL,
    file_url VARCHAR(512) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'extracted', 'verified', 'failed')),
    ocr_raw_payload JSONB,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_profile ON uploaded_files(pregnancy_profile_id);

-- 6. Bảng Biometric Data
CREATE TABLE IF NOT EXISTS biometric_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    checkup_id UUID NOT NULL REFERENCES checkups(id) ON DELETE CASCADE,
    uploaded_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
    gestational_age_days INT NOT NULL,
    bpd NUMERIC(5,2),
    hc NUMERIC(5,2),
    ac NUMERIC(5,2),
    fl NUMERIC(5,2),
    efw NUMERIC(6,2),
    status VARCHAR(50) DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified')),
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_biometric_data_profile ON biometric_data(pregnancy_profile_id);
CREATE INDEX IF NOT EXISTS idx_biometric_data_checkup ON biometric_data(checkup_id);

-- 7. Bảng OCR Correction Logs
CREATE TABLE IF NOT EXISTS ocr_correction_logs (
    id BIGSERIAL PRIMARY KEY,
    uploaded_file_id UUID NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    original_payload JSONB NOT NULL,
    corrected_payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bảng Analysis Results
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    checkup_id UUID NOT NULL REFERENCES checkups(id) ON DELETE CASCADE,
    biometric_data_id UUID NOT NULL REFERENCES biometric_data(id) ON DELETE RESTRICT,
    model_version VARCHAR(100) NOT NULL,
    rules_version VARCHAR(100) NOT NULL,
    bpd_zscore NUMERIC(4,2),
    bpd_percentile NUMERIC(5,2),
    hc_zscore NUMERIC(4,2),
    hc_percentile NUMERIC(5,2),
    ac_zscore NUMERIC(4,2),
    ac_percentile NUMERIC(5,2),
    fl_zscore NUMERIC(4,2),
    fl_percentile NUMERIC(5,2),
    efw_zscore NUMERIC(4,2),
    efw_percentile NUMERIC(5,2),
    anomaly_probability NUMERIC(5,4) NOT NULL,
    warning_level VARCHAR(20) NOT NULL CHECK (warning_level IN ('green', 'yellow', 'red')),
    explanation_doctor TEXT NOT NULL,
    explanation_patient TEXT NOT NULL,
    disclaimer_text TEXT NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analysis_results_profile ON analysis_results(pregnancy_profile_id);

-- 9. Bảng Medical Reports
CREATE TABLE IF NOT EXISTS medical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    checkup_id UUID NOT NULL REFERENCES checkups(id) ON DELETE CASCADE,
    analysis_result_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE RESTRICT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('doctor_professional', 'patient_simplified')),
    pdf_url VARCHAR(512) NOT NULL,
    generated_by UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Bảng Mapping Verification Queue
CREATE TABLE IF NOT EXISTS mapping_verification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_file_id UUID NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    raw_label VARCHAR(255) NOT NULL,
    mapped_attribute VARCHAR(50) CHECK (mapped_attribute IN ('bpd', 'hc', 'ac', 'fl', 'efw')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 11. Bảng Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('checkup_reminder', 'new_analysis', 'system')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
