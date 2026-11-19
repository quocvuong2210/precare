# backend/tests/test_pregnancy_profile_api.py
import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

# Cho phép SQLite render kiểu JSONB của PostgreSQL trong môi trường test
if not hasattr(SQLiteTypeCompiler, "visit_JSONB"):
    SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"

from app.core.database import Base
from app.models.user import User
from app.models.pregnancy_profile import PregnancyProfile
from app.models.audit_log import AuditLog
from app.models.checkup import Checkup
from app.models.biometric_data import BiometricData
from app.models.deletion_request import DeletionRequest
from app.models.uploaded_file import UploadedFile
from app.schemas.pregnancy_profile import (
    CreatePregnancyProfileRequest,
    UpdatePregnancyProfileRequest,
    UpdatePregnancyProfileStatusRequest,
    CalculateGestationalAgeRequest,
)
from app.api.pregnancy import (
    create_pregnancy_profile,
    get_active_pregnancy_profile,
    get_pregnancy_profile_detail,
    list_pregnancy_profiles,
    update_pregnancy_profile,
    update_pregnancy_profile_status,
    calculate_preview,
    get_eligible_patients,
)

# Thiết lập SQLite in-memory cho test
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_users(db_session):
    patient1 = User(
        id=uuid.uuid4(),
        email="patient1@example.com",
        password_hash="hash1",
        full_name="Nguyen Thi A",
        role="pregnant_woman",
        phone_number="0912345678"
    )
    patient2 = User(
        id=uuid.uuid4(),
        email="patient2@example.com",
        password_hash="hash2",
        full_name="Le Thi B",
        role="pregnant_woman",
        phone_number="0987654321"
    )
    doctor = User(
        id=uuid.uuid4(),
        email="doctor@example.com",
        password_hash="hash3",
        full_name="BS. Tran Van B",
        role="doctor",
        phone_number="0909090909"
    )
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        password_hash="hash4",
        full_name="System Admin",
        role="admin"
    )
    db_session.add_all([patient1, patient2, doctor, admin])
    db_session.commit()
    return {"patient1": patient1, "patient2": patient2, "doctor": doctor, "admin": admin}


# ==============================================================================
# 1. TEST POST /api/v1/pregnancy-profiles (Khởi tạo hồ sơ thai kỳ)
# ==============================================================================

def test_patient_creates_profile_by_lmp(db_session, sample_users):
    patient = sample_users["patient1"]
    doctor = sample_users["doctor"]
    lmp_date = date.today() - timedelta(days=60)  # 60 ngày trước (~8 tuần 4 ngày)

    payload = CreatePregnancyProfileRequest(
        calculation_method="lmp",
        lmp=lmp_date,
        primary_doctor_id=doctor.id
    )

    response = create_pregnancy_profile(
        payload=payload,
        request=None,
        db=db_session,
        current_user=patient
    )

    assert response.success is True
    assert response.data.patient_id == patient.id
    assert response.data.primary_doctor_id == doctor.id
    assert response.data.lmp == lmp_date
    assert response.data.edd == lmp_date + timedelta(days=280)
    assert response.data.status == "active"
    assert response.data.current_gestational_age.days == 60
    assert response.data.current_gestational_age.weeks == 8
    assert response.data.current_gestational_age.remaining_days == 4
    assert response.data.current_gestational_age.formatted == "8w4d"
    assert response.data.current_gestational_age.trimester == 1

    # Kiểm tra audit log đã ghi
    log = db_session.query(AuditLog).filter(AuditLog.target_id == response.data.id).first()
    assert log is not None
    assert log.action == "CREATE_PROFILE"
    assert log.target_table == "pregnancy_profiles"


def test_create_profile_duplicate_active_rejected(db_session, sample_users):
    patient = sample_users["patient1"]
    lmp_date = date.today() - timedelta(days=60)

    # Tạo hồ sơ active thứ nhất
    payload = CreatePregnancyProfileRequest(
        calculation_method="lmp",
        lmp=lmp_date
    )
    create_pregnancy_profile(payload=payload, request=None, db=db_session, current_user=patient)

    # Cố tạo hồ sơ active thứ hai cho cùng thai phụ -> Phải báo lỗi 400
    with pytest.raises(HTTPException) as exc_info:
        create_pregnancy_profile(payload=payload, request=None, db=db_session, current_user=patient)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "ACTIVE_PROFILE_EXISTS"


def test_doctor_creates_profile_with_q1_ultrasound(db_session, sample_users):
    doctor = sample_users["doctor"]
    patient = sample_users["patient2"]
    us_date = date.today() - timedelta(days=14)

    payload = CreatePregnancyProfileRequest(
        patient_id=patient.id,
        calculation_method="q1_ultrasound",
        q1_ultrasound_date=us_date,
        q1_gestational_weeks=11,
        q1_gestational_days=3
    )

    response = create_pregnancy_profile(
        payload=payload,
        request=None,
        db=db_session,
        current_user=doctor
    )

    assert response.success is True
    assert response.data.patient_id == patient.id
    assert response.data.primary_doctor_id == doctor.id
    assert response.data.q1_gestational_weeks == 11
    assert response.data.q1_gestational_days == 3
    # GA at Q1 = 11*7 + 3 = 80 ngày.
    # EDD = us_date + (280 - 80) = us_date + 200 ngày
    assert response.data.edd == us_date + timedelta(days=200)
    # Tuổi thai hôm nay = 80 + 14 = 94 ngày (~13w3d)
    assert response.data.current_gestational_age.days == 94
    assert response.data.current_gestational_age.formatted == "13w3d"


# ==============================================================================
# 2. TEST GET /api/v1/pregnancy-profiles/active (Lấy hồ sơ đang hoạt động)
# ==============================================================================

def test_get_active_profile(db_session, sample_users):
    patient = sample_users["patient1"]
    doctor = sample_users["doctor"]
    lmp_date = date.today() - timedelta(days=70)

    # Tạo hồ sơ active
    payload = CreatePregnancyProfileRequest(
        calculation_method="lmp",
        lmp=lmp_date,
        primary_doctor_id=doctor.id
    )
    created = create_pregnancy_profile(payload=payload, request=None, db=db_session, current_user=patient)

    # 1. Thai phụ tự lấy hồ sơ của mình
    res_patient = get_active_pregnancy_profile(
        patient_id=None,
        request=None,
        db=db_session,
        current_user=patient
    )
    assert res_patient.success is True
    assert res_patient.data.id == created.data.id
    assert res_patient.data.patient.id == patient.id
    assert res_patient.data.primary_doctor.id == doctor.id

    # 2. Bác sĩ tra cứu theo patient_id
    res_doctor = get_active_pregnancy_profile(
        patient_id=patient.id,
        request=None,
        db=db_session,
        current_user=doctor
    )
    assert res_doctor.success is True
    assert res_doctor.data.id == created.data.id


def test_get_active_profile_not_found(db_session, sample_users):
    patient = sample_users["patient1"]
    with pytest.raises(HTTPException) as exc_info:
        get_active_pregnancy_profile(
            patient_id=None,
            request=None,
            db=db_session,
            current_user=patient
        )
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "ACTIVE_PROFILE_NOT_FOUND"


# ==============================================================================
# 3. TEST GET /api/v1/pregnancy-profiles/{profile_id} (Chi tiết theo ID & IDOR)
# ==============================================================================

def test_get_profile_detail_and_idor_protection(db_session, sample_users):
    patient1 = sample_users["patient1"]
    patient2 = sample_users["patient2"]
    doctor = sample_users["doctor"]

    lmp_date = date.today() - timedelta(days=70)
    created = create_pregnancy_profile(
        payload=CreatePregnancyProfileRequest(calculation_method="lmp", lmp=lmp_date),
        request=None,
        db=db_session,
        current_user=patient1
    )
    profile_id = created.data.id

    # 1. Chính chủ xem hồ sơ -> 200 OK
    detail = get_pregnancy_profile_detail(
        profile_id=profile_id,
        target_date=None,
        request=None,
        db=db_session,
        current_user=patient1
    )
    assert detail.success is True
    assert detail.data.id == profile_id

    # 2. Bác sĩ xem hồ sơ -> 200 OK
    doc_view = get_pregnancy_profile_detail(
        profile_id=profile_id,
        target_date=None,
        request=None,
        db=db_session,
        current_user=doctor
    )
    assert doc_view.success is True

    # 3. Thai phụ khác cố xem hồ sơ (IDOR attack) -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        get_pregnancy_profile_detail(
            profile_id=profile_id,
            target_date=None,
            request=None,
            db=db_session,
            current_user=patient2
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "PERMISSION_DENIED"


# ==============================================================================
# 4. TEST GET /api/v1/pregnancy-profiles (Danh sách phân trang & bộ lọc)
# ==============================================================================

def test_list_pregnancy_profiles(db_session, sample_users):
    doctor = sample_users["doctor"]
    patient1 = sample_users["patient1"]
    patient2 = sample_users["patient2"]

    # Tạo 2 hồ sơ
    create_pregnancy_profile(
        payload=CreatePregnancyProfileRequest(calculation_method="lmp", lmp=date.today() - timedelta(days=40)),
        request=None,
        db=db_session,
        current_user=patient1
    )
    create_pregnancy_profile(
        payload=CreatePregnancyProfileRequest(calculation_method="lmp", lmp=date.today() - timedelta(days=50)),
        request=None,
        db=db_session,
        current_user=patient2
    )

    list_res = list_pregnancy_profiles(
        page=1,
        page_size=10,
        status="active",
        search="Nguyen Thi A",
        doctor_id=None,
        db=db_session,
        current_user=doctor
    )

    assert list_res.success is True
    assert len(list_res.data.items) == 1
    assert list_res.data.items[0].patient_name == "Nguyen Thi A"
    assert list_res.data.pagination.total_items == 1


# ==============================================================================
# 5. TEST PUT /api/v1/pregnancy-profiles/{profile_id} (Cập nhật hồ sơ)
# ==============================================================================

def test_update_pregnancy_profile(db_session, sample_users):
    patient1 = sample_users["patient1"]
    lmp_original = date.today() - timedelta(days=60)

    created = create_pregnancy_profile(
        payload=CreatePregnancyProfileRequest(calculation_method="lmp", lmp=lmp_original),
        request=None,
        db=db_session,
        current_user=patient1
    )
    profile_id = created.data.id

    # Cập nhật ngày LMP mới và recalculate EDD
    new_lmp = date.today() - timedelta(days=70)
    update_payload = UpdatePregnancyProfileRequest(
        lmp=new_lmp,
        recalculate_edd=True
    )

    updated = update_pregnancy_profile(
        profile_id=profile_id,
        payload=update_payload,
        request=None,
        db=db_session,
        current_user=patient1
    )

    assert updated.success is True
    assert updated.data.lmp == new_lmp
    assert updated.data.edd == new_lmp + timedelta(days=280)
    assert updated.data.current_gestational_age.days == 70


# ==============================================================================
# 6. TEST PATCH /api/v1/pregnancy-profiles/{profile_id}/status (Đổi trạng thái)
# ==============================================================================

def test_update_pregnancy_profile_status(db_session, sample_users):
    patient1 = sample_users["patient1"]
    created = create_pregnancy_profile(
        payload=CreatePregnancyProfileRequest(calculation_method="lmp", lmp=date.today() - timedelta(days=60)),
        request=None,
        db=db_session,
        current_user=patient1
    )
    profile_id = created.data.id

    # Chuyển sang completed
    patch_payload = UpdatePregnancyProfileStatusRequest(
        status="completed",
        reason="Sinh thường an toàn tại Bệnh viện Phụ sản"
    )
    res = update_pregnancy_profile_status(
        profile_id=profile_id,
        payload=patch_payload,
        request=None,
        db=db_session,
        current_user=patient1
    )

    assert res.success is True
    assert res.data.status == "completed"

    # Bây giờ có thể tạo hồ sơ mới vì hồ sơ cũ đã completed
    new_profile = create_pregnancy_profile(
        payload=CreatePregnancyProfileRequest(calculation_method="lmp", lmp=date.today() - timedelta(days=20)),
        request=None,
        db=db_session,
        current_user=patient1
    )
    assert new_profile.success is True
    assert new_profile.data.status == "active"


# ==============================================================================
# 7. TEST POST /api/v1/pregnancy-profiles/calculate (Preview Utility Engine)
# ==============================================================================

def test_calculate_preview_endpoint():
    target = date(2026, 10, 18)
    lmp = date(2026, 6, 1)

    payload = CalculateGestationalAgeRequest(
        target_date=target,
        lmp=lmp
    )
    res = calculate_preview(payload)

    assert res["success"] is True
    assert res["data"]["calculated_edd"] == date(2027, 3, 8)
    assert res["data"]["gestational_age"]["days"] == 139
    assert res["data"]["gestational_age"]["formatted"] == "19w6d"


# ==============================================================================
# 8. TEST GET /api/v1/pregnancy-profiles/eligible-patients
# ==============================================================================

def test_get_eligible_patients(db_session):
    doctor = User(
        id=uuid.uuid4(),
        email="doctor.eligible@example.com",
        password_hash="hash_doc",
        full_name="BS. Dang Thi Hoa",
        role="doctor"
    )
    # Thai phụ 1: có hồ sơ active
    patient1 = User(
        id=uuid.uuid4(),
        email="patient1.has_active@example.com",
        password_hash="hash_p1",
        full_name="Tran Thi Active",
        role="pregnant_woman",
        phone_number="0911111111"
    )
    # Thai phụ 2: chưa từng có hồ sơ nào
    patient2 = User(
        id=uuid.uuid4(),
        email="patient2.no_profile@example.com",
        password_hash="hash_p2",
        full_name="Le Thi ChuaHoSo",
        role="pregnant_woman",
        phone_number="0922222222"
    )
    # Thai phụ 3: có hồ sơ nhưng đã completed (đã sinh)
    patient3 = User(
        id=uuid.uuid4(),
        email="patient3.completed@example.com",
        password_hash="hash_p3",
        full_name="Pham Thi DaSinh",
        role="pregnant_woman",
        phone_number="0933333333"
    )
    db_session.add_all([doctor, patient1, patient2, patient3])
    db_session.commit()

    # Tạo hồ sơ active cho patient1
    profile1 = PregnancyProfile(
        id=uuid.uuid4(),
        patient_id=patient1.id,
        primary_doctor_id=doctor.id,
        lmp=date.today() - timedelta(days=60),
        edd=date.today() + timedelta(days=220),
        status="active",
        is_deleted=False
    )
    # Tạo hồ sơ completed cho patient3
    profile3 = PregnancyProfile(
        id=uuid.uuid4(),
        patient_id=patient3.id,
        primary_doctor_id=doctor.id,
        lmp=date.today() - timedelta(days=300),
        edd=date.today() - timedelta(days=20),
        status="completed",
        is_deleted=False
    )
    db_session.add_all([profile1, profile3])
    db_session.commit()

    # Bác sĩ gọi API lấy danh sách thai phụ đủ điều kiện tạo hồ sơ mới
    res = get_eligible_patients(db=db_session, current_user=doctor)

    assert res.success is True
    assert res.total == 2
    returned_ids = {p.id for p in res.data}
    assert patient2.id in returned_ids
    assert patient3.id in returned_ids
    assert patient1.id not in returned_ids
