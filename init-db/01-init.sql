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

-- 3. Bảng Pregnancy Profiles (Cập nhật chuẩn theo PRC-32)
CREATE TABLE IF NOT EXISTS pregnancy_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    primary_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lmp DATE,                                 -- Ngày đầu kỳ kinh cuối (Last Menstrual Period)
    q1_ultrasound_date DATE,                  -- Ngày thực hiện siêu âm quý 1
    q1_gestational_weeks INT,                 -- Tuổi thai (tuần) tại thời điểm siêu âm Q1
    q1_gestational_days INT,                  -- Tuổi thai (ngày lẻ) tại thời điểm siêu âm Q1 (0 - 6)
    crl_mm NUMERIC(5,2),                      -- Chiều dài đầu mông (Crown-Rump Length mm)
    edd DATE NOT NULL,                        -- Ngày dự sinh đã chốt (Estimated Date of Delivery)
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    -- [THÊM 4 DÒNG MỚI VÀO ĐÂY]
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_anonymized BOOLEAN DEFAULT FALSE,
    is_purged_from_research BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME  ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_gestational_days CHECK (q1_gestational_days IS NULL OR (q1_gestational_days >= 0 AND q1_gestational_days <= 6)),
    CONSTRAINT chk_gestational_weeks CHECK (q1_gestational_weeks IS NULL OR (q1_gestational_weeks >= 0 AND q1_gestational_weeks <= 42)),
    CONSTRAINT chk_crl_positive CHECK (crl_mm IS NULL OR crl_mm > 0)
);
-- Chỉ mục tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_patient ON pregnancy_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_doctor ON pregnancy_profiles(primary_doctor_id);
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_status ON pregnancy_profiles(status);
-- [THÊM INDEX NÀY ĐỂ TỐI ƯU TRUY VẤN LỌC HỒ SƠ CHƯA XÓA]
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_not_deleted ON pregnancy_profiles(patient_id) WHERE is_deleted = FALSE;

-- Ràng buộc Partial Unique Index: Mỗi thai phụ chỉ có tối đa 1 hồ sơ ở trạng thái 'active'
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_pregnancy_per_patient 
ON pregnancy_profiles(patient_id) 
WHERE status = 'active';

-- 4. Bảng Checkups
CREATE TABLE IF NOT EXISTS checkups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id),
    checkup_date DATE NOT NULL,
    gestational_age_days INT NOT NULL,        -- Tuổi thai gt tính bằng ngày tại ngày khám (nội suy từ EDD)
    weight_kg NUMERIC(5,2),                   -- Cân nặng mẹ bầu (kg)
    blood_pressure_systolic INT,              -- Huyết áp tâm thu (mmHg)
    blood_pressure_diastolic INT,             -- Huyết áp tâm trương (mmHg)
    notes TEXT,                               -- Lời dặn, chẩn đoán sơ bộ
    is_deleted BOOLEAN DEFAULT FALSE,         -- Hỗ trợ Soft-delete y tế (PRC-37)
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ràng buộc y tế hợp lý
    CONSTRAINT chk_gestational_age_range CHECK (gestational_age_days >= 0 AND gestational_age_days <= 315),
    CONSTRAINT chk_weight_positive CHECK (weight_kg IS NULL OR (weight_kg >= 30.0 AND weight_kg <= 200.0)),
    CONSTRAINT chk_blood_pressure CHECK (
        (blood_pressure_systolic IS NULL AND blood_pressure_diastolic IS NULL) OR
        (blood_pressure_systolic > blood_pressure_diastolic AND blood_pressure_systolic >= 60 AND blood_pressure_systolic <= 250 AND blood_pressure_diastolic >= 40 AND blood_pressure_diastolic <= 150)
    )
);
CREATE INDEX IF NOT EXISTS idx_checkups_profile ON checkups(pregnancy_profile_id);
CREATE INDEX IF NOT EXISTS idx_checkups_doctor ON checkups(doctor_id);
CREATE INDEX IF NOT EXISTS idx_checkups_date ON checkups(checkup_date);
CREATE INDEX IF NOT EXISTS idx_checkups_gt ON checkups(gestational_age_days);
CREATE INDEX IF NOT EXISTS idx_checkups_not_deleted ON checkups(pregnancy_profile_id) WHERE is_deleted = FALSE;

-- 5. Bảng Uploaded Files (Đồng bộ chuẩn Story 4.1 & API Contract)
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    checkup_id UUID REFERENCES checkups(id) ON DELETE SET NULL, -- Gắn với lần khám nếu tải lên trong buổi khám
    file_url VARCHAR(512) NOT NULL,                           -- Đường dẫn Object Storage (S3/MinIO key)
    file_type VARCHAR(50) NOT NULL,                           -- Loại file: 'application/pdf', 'image/jpeg', 'image/png'
    file_name VARCHAR(255),                                   -- Tên file gốc người dùng tải lên
    file_size_bytes BIGINT,                                   -- Dung lượng file (bytes)
    document_type VARCHAR(50) DEFAULT 'ultrasound_report'     -- 'ultrasound_report', 'blood_test', 'urinalysis', 'other'
        CHECK (document_type IN ('ultrasound_report', 'blood_test', 'urinalysis', 'other')),
    status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'extracted', 'verified', 'failed')),
    celery_task_id VARCHAR(100),                              -- ID của Celery Task xử lý ngầm trong Redis
    error_message TEXT,                                       -- Lưu thông báo lỗi nếu quá trình OCR/Extract thất bại
    ocr_raw_payload JSONB,                                    -- Kết quả bóc tách thô (sẽ do Celery worker ghi)
    uploaded_by UUID REFERENCES users(id),                    -- Người tải lên (Bác sĩ hoặc Thai phụ)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_profile ON uploaded_files(pregnancy_profile_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_checkup ON uploaded_files(checkup_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_task ON uploaded_files(celery_task_id);

-- 6. Bảng Biometric Data
CREATE TABLE IF NOT EXISTS biometric_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    checkup_id UUID NOT NULL REFERENCES checkups(id) ON DELETE CASCADE,
    uploaded_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
    gestational_age_days INT NOT NULL,        -- Đồng bộ gt với lần khám
    bpd NUMERIC(5,2),                         -- Biparietal Diameter: Đường kính lưỡng đỉnh (mm)
    hc NUMERIC(5,2),                          -- Head Circumference: Chu vi vòng đầu (mm)
    ac NUMERIC(5,2),                          -- Abdominal Circumference: Chu vi vòng bụng (mm)
    fl NUMERIC(5,2),                          -- Femur Length: Chiều dài xương đùi (mm)
    efw NUMERIC(6,2),                         -- Estimated Fetal Weight: Cân nặng thai nhi ước tính (gram)
    status VARCHAR(50) DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified')),
    verified_by UUID REFERENCES users(id),    -- Bác sĩ xác thực chỉ số
    is_deleted BOOLEAN DEFAULT FALSE,         -- Hỗ trợ Soft-delete y tế (PRC-37)
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ràng buộc giá trị hợp lý lâm sàng
    CONSTRAINT chk_biometrics_positive CHECK (
        (bpd IS NULL OR (bpd >= 10.0 AND bpd <= 120.0)) AND
        (hc IS NULL OR (hc >= 50.0 AND hc <= 400.0)) AND
        (ac IS NULL OR (ac >= 50.0 AND ac <= 450.0)) AND
        (fl IS NULL OR (fl >= 5.0 AND fl <= 95.0)) AND
        (efw IS NULL OR (efw >= 50.0 AND efw <= 6000.0))
    )
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

-- ============================================================================
-- Bảng Deletion Requests (PRC-37)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pregnancy_profile_id UUID NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
    checkup_id UUID REFERENCES checkups(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('full_profile', 'single_checkup')),
    reason TEXT NOT NULL,
    allow_anonymized_research BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    is_anonymized BOOLEAN DEFAULT FALSE,
    is_purged_from_research BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requester ON deletion_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_profile ON deletion_requests(pregnancy_profile_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);

-- ============================================================================
-- 13. Bảng Password Resets (PRC-OTP/Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reset_code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- ============================================================================
-- 14. Bảng Refresh Tokens (PRC-JWT Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token_hash);

-- ============================================================================
-- DỮ LIỆU SEED MẪU KHỞI TẠO HỆ THỐNG (INITIAL SYSTEM SEED DATA)
-- Toàn bộ mật khẩu mặc định của các tài khoản demo là: password123
-- Được băm an toàn theo chuẩn bcrypt thông qua extension pgcrypto:
-- crypt('password123', gen_salt('bf', 10))
-- ============================================================================

-- 1. SEED USERS (Tài khoản Quản trị, Bác sĩ sản khoa, Thai phụ & Test)
INSERT INTO users (id, email, password_hash, full_name, role, phone_number, is_active) VALUES
-- Quản trị viên hệ thống (Admin)
('00000000-0000-0000-0000-000000000001', 'admin@precare.vn', crypt('password123', gen_salt('bf', 10)), 'Quản Trị Viên Hệ Thống', 'admin', '0900000001', TRUE),
('00000000-0000-0000-0000-000000000002', 'admin@example.com', crypt('password123', gen_salt('bf', 10)), 'System Admin (Test)', 'admin', '0900000002', TRUE),

-- Bác sĩ Sản khoa (Doctors) - Dùng cho Web Doctor Portal & Mobile App API sync
('00000000-0000-0000-0000-000000000010', 'bacsi.leminh@phusantw.org', crypt('password123', gen_salt('bf', 10)), 'BS. CKI Lê Minh', 'doctor', '0901234567', TRUE),
('00000000-0000-0000-0000-000000000011', 'bacsi.nguyen@precare.vn', crypt('password123', gen_salt('bf', 10)), 'BS. Nguyễn Thu Hương', 'doctor', '0902345678', TRUE),
('00000000-0000-0000-0000-000000000012', 'nguyenminhhoang@precare.vn', crypt('password123', gen_salt('bf', 10)), 'BS. CKII Nguyễn Minh Hoàng', 'doctor', '0903456789', TRUE),
('00000000-0000-0000-0000-000000000013', 'doctor@example.com', crypt('password123', gen_salt('bf', 10)), 'BS. Trần Văn B', 'doctor', '0909090909', TRUE),

-- Thai phụ (Pregnant Women) - Phù hợp với dữ liệu lâm sàng Web Doctor & Mobile
('00000000-0000-0000-0000-000000000020', 'kimngan.bui@gmail.com', crypt('password123', gen_salt('bf', 10)), 'Bùi Kim Ngân', 'pregnant_woman', '0945888999', TRUE),
('00000000-0000-0000-0000-000000000021', 'haiyen.le@gmail.com', crypt('password123', gen_salt('bf', 10)), 'Lê Hoàng Hải Yến', 'pregnant_woman', '0912345678', TRUE),
('00000000-0000-0000-0000-000000000022', 'hongnhung.tran@gmail.com', crypt('password123', gen_salt('bf', 10)), 'Trần Hồng Nhung', 'pregnant_woman', '0933445566', TRUE),
('00000000-0000-0000-0000-000000000023', 'hoangmai.le@example.com', crypt('password123', gen_salt('bf', 10)), 'Lê Hoàng Mai', 'pregnant_woman', '0977889900', TRUE),
('00000000-0000-0000-0000-000000000024', 'thaochi.nguyen@gmail.com', crypt('password123', gen_salt('bf', 10)), 'Nguyễn Thảo Chi', 'pregnant_woman', '0987654321', TRUE),
('00000000-0000-0000-0000-000000000025', 'minhthu.pham@gmail.com', crypt('password123', gen_salt('bf', 10)), 'Phạm Minh Thư', 'pregnant_woman', '0905123456', TRUE),
('00000000-0000-0000-0000-000000000026', 'quynhanh.dang@gmail.com', crypt('password123', gen_salt('bf', 10)), 'Đặng Quỳnh Anh', 'pregnant_woman', '0966112233', TRUE),
('00000000-0000-0000-0000-000000000027', 'patient1@example.com', crypt('password123', gen_salt('bf', 10)), 'Nguyen Thi A (Test)', 'pregnant_woman', '0912345679', TRUE),
('00000000-0000-0000-0000-000000000028', 'patient2@example.com', crypt('password123', gen_salt('bf', 10)), 'Le Thi B (Test)', 'pregnant_woman', '0987654322', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. SEED PREGNANCY PROFILES (Hồ sơ thai kỳ đa dạng các kịch bản lâm sàng)
INSERT INTO pregnancy_profiles (
    id, patient_id, primary_doctor_id, lmp, q1_ultrasound_date, q1_gestational_weeks, q1_gestational_days, crl_mm, edd, status, is_deleted, created_at
) VALUES
-- Hồ sơ 1: Bùi Kim Ngân - Thai sớm Quý 1 (7 tuần, tính theo CRL siêu âm 10mm)
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000011', '2026-11-05', '2026-11-05', 7, 0, 10.00, '2027-06-24', 'active', FALSE, '2026-10-18 09:30:00+07'),

-- Hồ sơ 2: Lê Hoàng Hải Yến - Thai kỳ chuẩn bình thường Quý 3 (32w4d, theo dõi tăng trưởng chuẩn 50th percentile)
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', '2026-03-01', '2026-05-24', 12, 0, 54.00, '2026-12-06', 'active', FALSE, '2026-03-15 08:30:00+07'),

-- Hồ sơ 3: Nguyễn Thảo Chi - Thai kỳ có CỜ ĐỎ LÂM SÀNG FGR (Thai chậm tăng trưởng tử cung, AC & EFW < 10th percentile)
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000010', '2026-02-15', '2026-05-10', 12, 0, 52.00, '2026-11-22', 'active', FALSE, '2026-02-20 09:00:00+07'),

-- Hồ sơ 4: Phạm Minh Thư - Thai kỳ Quý 2 (18 tuần, có kết quả OCR cần bác sĩ duyệt)
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000013', '2026-05-10', '2026-08-02', 12, 0, 55.00, '2027-02-14', 'active', FALSE, '2026-05-20 10:15:00+07'),

-- Hồ sơ 5: Trần Hồng Nhung - Hồ sơ thai kỳ đã hoàn thành (Status: completed - Đã sinh thường bé khỏe mạnh)
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000010', '2026-01-01', '2026-03-26', 12, 0, 53.00, '2026-10-08', 'completed', FALSE, '2026-01-10 08:00:00+07'),

-- Hồ sơ 6: Lê Hoàng Mai - Hồ sơ thai kỳ đình chỉ (Status: terminated - Đình chỉ do lý do y khoa)
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000011', '2026-02-01', '2026-04-26', 12, 0, 51.00, '2026-11-08', 'terminated', FALSE, '2026-02-10 09:30:00+07')
ON CONFLICT (id) DO NOTHING;
-- Ghi chú: Đặng Quỳnh Anh ('00000000-0000-0000-0000-000000000026') chưa có hồ sơ thai kỳ, dùng kiểm thử API eligible-patients.

-- 3. SEED CHECKUPS (Các lần khám thai định kỳ theo tuần tuổi thai chuẩn)
INSERT INTO checkups (
    id, pregnancy_profile_id, doctor_id, checkup_date, gestational_age_days, weight_kg, blood_pressure_systolic, blood_pressure_diastolic, notes, is_deleted, created_at
) VALUES
-- Khám thai cho Bùi Kim Ngân (Hồ sơ 1 - 7 tuần)
('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '2026-11-05', 49, 48.50, 110, 70, 'Khám thai sớm Quý 1. Túi thai trong tử cung, tim thai (+). Bổ sung sắt, acid folic.', FALSE, '2026-11-05 09:30:00+07'),

-- Khám thai cho Lê Hoàng Hải Yến (Hồ sơ 2 - 4 lần khám liên tiếp bình thường)
-- Lần 1: 12 tuần (84 ngày)
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-05-24', 84, 52.50, 110, 70, 'Khám thai 12 tuần Quý 1. Đo độ mờ da gáy NT 1.2mm bình thường. Hình thái thai sớm bình thường.', FALSE, '2026-05-24 08:30:00+07'),
-- Lần 2: 20 tuần 2 ngày (142 ngày)
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-07-21', 142, 55.80, 115, 75, 'Siêu âm hình thái học 4D Quý 2. Cấu trúc tim thai 4 buồng rõ, não thất bình thường. Sinh trắc tương đương bách phân vị 50.', FALSE, '2026-07-21 09:00:00+07'),
-- Lần 3: 28 tuần 1 ngày (197 ngày)
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-09-14', 197, 59.20, 118, 76, 'Khám thai định kỳ đầu Quý 3. Nghiệm pháp dung nạp glucose bình thường. Ngôi thai thuận.', FALSE, '2026-09-14 09:15:00+07'),
-- Lần 4: 32 tuần 4 ngày (228 ngày)
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-10-15', 228, 62.00, 120, 78, 'Khám thai 32 tuần. Chỉ số ối AFI 13cm tốt. Tim thai 142 lần/phút. Quỹ đạo phát triển đồng đều.', FALSE, '2026-10-15 10:00:00+07'),

-- Khám thai cho Nguyễn Thảo Chi (Hồ sơ 3 - Thai chậm tăng trưởng FGR)
-- Lần 1: 22 tuần (154 ngày)
('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '2026-07-19', 154, 51.00, 115, 70, 'Siêu âm hình thái học Quý 2. Các chỉ số sinh trắc ở mức phân vị 45%, thai phát triển ổn định.', FALSE, '2026-07-19 08:45:00+07'),
-- Lần 2: 28 tuần (196 ngày)
('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '2026-08-30', 196, 52.50, 125, 82, 'Chỉ số AC và EFW có xu hướng chậm lại, tụt xuống bách phân vị 15 (sụt giảm > 20 điểm phân vị). Huyết áp mẹ tăng nhẹ.', FALSE, '2026-08-30 09:30:00+07'),
-- Lần 3: 32 tuần (224 ngày)
('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '2026-09-27', 224, 53.00, 135, 88, 'CẢNH BÁO LÂM SÀNG: Chu vi vòng bụng AC và EFW < bách phân vị thứ 10. Chẩn đoán: Theo dõi thai FGR khởi phát muộn kèm tiền sản giật nhẹ. Chỉ định Doppler động mạch rốn & NST hàng tuần.', FALSE, '2026-09-27 10:15:00+07'),

-- Khám thai cho Phạm Minh Thư (Hồ sơ 4 - Quý 2)
('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000013', '2026-08-05', 87, 49.00, 105, 65, 'Khám thai 12 tuần, NT 1.1mm bình thường. NIPT nguy cơ thấp.', FALSE, '2026-08-05 09:00:00+07'),
('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000013', '2026-09-13', 126, 51.50, 110, 70, 'Khám định kỳ 18 tuần. Sinh trắc thai bình thường, đã tải phiếu siêu âm lên hệ thống.', FALSE, '2026-09-13 14:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED UPLOADED FILES (Tài liệu phiếu siêu âm số hóa OCR)
INSERT INTO uploaded_files (
    id, pregnancy_profile_id, checkup_id, file_url, file_type, file_name, file_size_bytes, document_type, status, celery_task_id, ocr_raw_payload, uploaded_by, created_at
) VALUES
-- File 1: Phiếu siêu âm 18w của Phạm Minh Thư (Trạng thái extracted - Đang chờ bác sĩ xác thực)
('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000009', 'ultrasound/2026/09/us_report_18w_minhthu.pdf', 'application/pdf', 'phieu_sieu_am_18w_minhthu.pdf', 524288, 'ultrasound_report', 'extracted', 'celery-task-ocr-001', '{"document_type": "ultrasound_report", "extracted_fields": {"bpd_mm": 42.0, "hc_mm": 153.0, "ac_mm": 132.0, "fl_mm": 28.0, "efw_g": 235.0}, "raw_text": "Phieu sieu am 2D thai 18 tuan - BPD 42mm, HC 153mm, AC 132mm, FL 28mm, EFW 235g", "confidence_scores": {"bpd": 0.98, "hc": 0.96, "ac": 0.95, "fl": 0.97, "efw": 0.94}}'::jsonb, '00000000-0000-0000-0000-000000000025', '2026-09-13 14:05:00+07'),

-- File 2: Phiếu siêu âm 32w của Lê Hoàng Hải Yến (Đã được bác sĩ xác thực verified)
('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'ultrasound/2026/10/us_report_32w_haiyen.png', 'image/png', 'phieu_sieu_am_32w_haiyen.png', 1048576, 'ultrasound_report', 'verified', 'celery-task-ocr-002', '{"document_type": "ultrasound_report", "extracted_fields": {"bpd_mm": 82.5, "hc_mm": 298.0, "ac_mm": 285.0, "fl_mm": 62.0, "efw_g": 1980.0}, "raw_text": "Sieu am thai 32w4d - BPD: 82.5mm, HC: 298mm, AC: 285mm, FL: 62mm, EFW: 1980g", "confidence_scores": {"bpd": 0.99, "hc": 0.98, "ac": 0.97, "fl": 0.98, "efw": 0.96}}'::jsonb, '00000000-0000-0000-0000-000000000010', '2026-10-15 10:05:00+07')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED BIOMETRIC DATA (5 chỉ số sinh trắc vàng Hadlock IV: BPD, HC, AC, FL, EFW)
INSERT INTO biometric_data (
    id, pregnancy_profile_id, checkup_id, uploaded_file_id, gestational_age_days, bpd, hc, ac, fl, efw, status, verified_by, is_deleted, created_at
) VALUES
-- Sinh trắc Lê Hoàng Hải Yến (Tăng trưởng chuẩn phân vị 50)
-- 12 tuần: GA 84 ngày
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', NULL, 84, 21.00, 78.00, 65.00, 9.50, 60.00, 'verified', '00000000-0000-0000-0000-000000000010', FALSE, '2026-05-24 08:35:00+07'),
-- 20 tuần 2 ngày: GA 142 ngày
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', NULL, 142, 48.00, 178.00, 154.00, 33.00, 350.00, 'verified', '00000000-0000-0000-0000-000000000010', FALSE, '2026-07-21 09:05:00+07'),
-- 28 tuần 1 ngày: GA 197 ngày
('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', NULL, 197, 72.50, 263.00, 241.00, 53.50, 1220.00, 'verified', '00000000-0000-0000-0000-000000000010', FALSE, '2026-09-14 09:20:00+07'),
-- 32 tuần 4 ngày: GA 228 ngày
('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', 228, 82.50, 298.00, 285.00, 62.00, 1980.00, 'verified', '00000000-0000-0000-0000-000000000010', FALSE, '2026-10-15 10:10:00+07'),

-- Sinh trắc Nguyễn Thảo Chi (FGR - AC & EFW tụt dưới bách phân vị thứ 10)
-- 22 tuần: GA 154 ngày
('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', NULL, 154, 53.00, 198.00, 172.00, 38.00, 490.00, 'verified', '00000000-0000-0000-0000-000000000010', FALSE, '2026-07-19 08:50:00+07'),
-- 28 tuần: GA 196 ngày (Bắt đầu suy giảm)
('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', NULL, 196, 68.00, 250.00, 220.00, 49.00, 1020.00, 'verified', '00000000-0000-0000-0000-000000000010', FALSE, '2026-08-30 09:35:00+07'),
-- 32 tuần: GA 224 ngày (Cờ đỏ FGR < 10th percentile)
('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', NULL, 224, 76.00, 275.00, 250.00, 56.00, 1510.00, 'verified', '00000000-0000-0000-0000-000000000010', FALSE, '2026-09-27 10:20:00+07'),

-- Sinh trắc Phạm Minh Thư (Quý 2)
('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000008', NULL, 87, 22.00, 81.00, 68.00, 10.00, 65.00, 'verified', '00000000-0000-0000-0000-000000000013', FALSE, '2026-08-05 09:05:00+07'),
('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000001', 126, 42.00, 153.00, 132.00, 28.00, 235.00, 'pending_verification', NULL, FALSE, '2026-09-13 14:10:00+07')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED ANALYSIS RESULTS (Kết quả phân tích lâm sàng Hadlock IV & RACA-Net)
INSERT INTO analysis_results (
    id, pregnancy_profile_id, checkup_id, biometric_data_id, model_version, rules_version,
    bpd_zscore, bpd_percentile, hc_zscore, hc_percentile, ac_zscore, ac_percentile, fl_zscore, fl_percentile, efw_zscore, efw_percentile,
    anomaly_probability, warning_level, explanation_doctor, explanation_patient, disclaimer_text, analyzed_at
) VALUES
-- Phân tích 1: Lê Hoàng Hải Yến (32w4d - Phát triển bình thường Green Alert)
('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004',
'raca-net-v1.2', 'hadlock-iv-v2.0',
0.12, 54.80, 0.08, 53.20, 0.15, 56.00, -0.05, 48.00, 0.10, 54.00,
0.0210, 'green',
'Tất cả các chỉ số sinh trắc học BPD, HC, AC, FL và cân nặng thai EFW nằm trong dải phân vị 48-56% (trung bình Hadlock IV). Không phát hiện dấu hiệu bất thường tăng trưởng.',
'Em bé đang phát triển rất tốt và đều đặn theo đúng chuẩn tuổi thai 32 tuần. Cân nặng ước tính đạt khoảng gần 2kg.',
'Kết quả phân tích từ hệ thống hỗ trợ ra quyết định lâm sàng PreCare. Bác sĩ chuyên khoa giữ quyền chẩn đoán cuối cùng.',
'2026-10-15 10:15:00+07'),

-- Phân tích 2: Nguyễn Thảo Chi (32w0d - CẢNH BÁO ĐỎ Red Alert: Thai FGR, AC & EFW < 10th percentile)
('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000007',
'raca-net-v1.2', 'hadlock-iv-v2.0',
-1.05, 14.70, -1.18, 11.90, -1.62, 5.30, -1.25, 10.60, -1.55, 6.10,
0.8420, 'red',
'CẢNH BÁO ĐỎ (Safety Rule & Model Consensus): Chu vi vòng bụng (AC phân vị thứ 5.3) và EFW (phân vị thứ 6.1) đều tụt sâu dưới ngưỡng 10th percentile theo Hadlock IV. Quỹ đạo tăng trưởng sụt giảm liên tiếp > 20 percentile points. Nghi ngờ FGR khởi phát muộn, cần khảo sát Doppler động mạch rốn (UA PI, RI) và động mạch não giữa (MCA).',
'Chỉ số phát triển của thai nhi đang nhỏ hơn mức trung bình của tuổi thai 32 tuần. Bác sĩ cần theo dõi thêm lưu lượng máu nuôi thai và kiểm tra định kỳ hàng tuần để có hướng chăm sóc tối ưu.',
'Kết quả phân tích từ hệ thống hỗ trợ ra quyết định lâm sàng PreCare. Bác sĩ chuyên khoa giữ quyền chẩn đoán cuối cùng.',
'2026-09-27 10:25:00+07')
ON CONFLICT (id) DO NOTHING;

-- 7. SEED NOTIFICATIONS (Thông báo lâm sàng & nhắc lịch khám)
INSERT INTO notifications (
    id, user_id, title, content, is_read, type, scheduled_for, sent_at, created_at
) VALUES
('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021', 'Nhắc lịch khám thai định kỳ tuần 36', 'Chào bạn Hải Yến, bạn có lịch hẹn khám thai định kỳ vào ngày 08/11/2026 tại Bệnh viện Phụ sản Trung Ương.', FALSE, 'checkup_reminder', '2026-11-08 08:00:00+07', '2026-11-07 08:00:00+07', '2026-11-07 08:00:00+07'),
('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Cảnh báo tăng trưởng thai: Bệnh nhân Nguyễn Thảo Chi', 'Hệ thống PreCare phát hiện chỉ số AC và EFW của thai nhi bệnh nhân Nguyễn Thảo Chi dưới bách phân vị thứ 10 (FGR alert).', FALSE, 'new_analysis', NULL, '2026-09-27 10:26:00+07', '2026-09-27 10:26:00+07')
ON CONFLICT (id) DO NOTHING;

-- 8. SEED DELETION REQUESTS (Yêu cầu xóa dữ liệu y tế mẫu - PRC-37)
INSERT INTO deletion_requests (
    id, requester_id, pregnancy_profile_id, target_type, reason, allow_anonymized_research, status, review_notes, created_at
) VALUES
('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000006', 'full_profile', 'Đã chuyển sang khám và điều trị tại bệnh viện tuyến tỉnh, xin phép hủy lưu trữ hồ sơ trên ứng dụng.', TRUE, 'pending', NULL, '2026-02-15 11:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- 9. SEED MAPPING VERIFICATION QUEUE (Hàng đợi chuẩn hóa nhãn siêu âm)
INSERT INTO mapping_verification_queue (
    id, uploaded_file_id, raw_label, mapped_attribute, status, verified_by, verified_at
) VALUES
('80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'ĐK LƯỠNG ĐỈNH (BPD)', 'bpd', 'pending', NULL, NULL),
('80000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'CHU VI BỤNG (AC)', 'ac', 'pending', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
