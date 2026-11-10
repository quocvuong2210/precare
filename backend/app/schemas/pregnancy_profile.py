# backend/app/schemas/pregnancy_profile.py
from datetime import date, datetime
from typing import Optional, Literal, List
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator
from uuid import UUID


# ==========================================
# 1. Tuổi thai (Gestational Age) Models
# ==========================================

class GestationalAgeDetail(BaseModel):
    days: int = Field(..., description="Tổng số ngày tuổi thai (gt)")
    weeks: int = Field(..., description="Số tuần thai")
    remaining_days: int = Field(..., description="Số ngày lẻ còn lại (0-6)")
    formatted: str = Field(..., description="Ví dụ: 19w6d")
    trimester: int = Field(..., description="Tam cá nguyệt (1, 2 hoặc 3)")
    trimester_name: str = Field(..., description="Tên tam cá nguyệt")
    days_until_edd: int = Field(..., description="Số ngày đếm ngược đến ngày sinh")


# ==========================================
# 2. Preview / Calculate Engine Models
# ==========================================

class CalculateGestationalAgeRequest(BaseModel):
    target_date: Optional[date] = Field(default_factory=date.today, description="Ngày cần tính tuổi thai")
    lmp: Optional[date] = Field(None, description="Ngày đầu kỳ kinh cuối")
    q1_ultrasound_date: Optional[date] = Field(None, description="Ngày siêu âm quý 1")
    q1_gestational_weeks: Optional[int] = Field(None, ge=6, le=14, description="Tuần thai lúc siêu âm Q1 (6 - 14 tuần)")
    q1_gestational_days: Optional[int] = Field(0, ge=0, le=6, description="Ngày thai lẻ lúc siêu âm Q1 (0 - 6 ngày)")
    crl_mm: Optional[Decimal] = Field(None, ge=10.0, le=84.0, description="Chiều dài đầu mông (10mm - 84mm)")
    override_edd: Optional[date] = Field(None, description="Ngày dự sinh bác sĩ chỉ định trực tiếp")

    @model_validator(mode="after")
    def validate_clinical_inputs(self):
        today = date.today()
        if self.lmp:
            if self.lmp > today:
                raise ValueError("Ngày kinh cuối không được ở tương lai.")
            if (today - self.lmp).days > 300:
                raise ValueError("Ngày kinh cuối không hợp lệ hoặc vượt quá thời gian mang thai (> 300 ngày).")

        if self.q1_ultrasound_date:
            if self.q1_ultrasound_date > today:
                raise ValueError("Ngày siêu âm quý 1 không được ở tương lai.")
            if self.lmp and self.q1_ultrasound_date < self.lmp:
                raise ValueError("Ngày siêu âm không thể diễn ra trước ngày kinh cuối.")

        if not any([self.lmp, self.q1_ultrasound_date, self.override_edd]):
            raise ValueError("Cần cung cấp ít nhất một phương pháp: LMP, Siêu âm Quý 1 hoặc EDD chỉ định.")
            
        return self


class CalculateGestationalAgeResponse(BaseModel):
    target_date: date
    calculated_edd: date
    primary_method: Literal["lmp", "q1_ultrasound", "crl", "direct_edd"]
    clinical_note: str
    gestational_age: GestationalAgeDetail
    days_until_edd: int


# ==========================================
# 3. User Summaries
# ==========================================

class PatientSummary(BaseModel):
    """Thông tin tóm tắt của thai phụ"""
    id: UUID
    full_name: str
    phone_number: Optional[str] = None
    email: str


class DoctorSummary(BaseModel):
    """Thông tin tóm tắt của bác sĩ phụ trách"""
    id: UUID
    full_name: str
    email: Optional[str] = None


# ==========================================
# 4. Request Payloads for Pregnancy Profile
# ==========================================

class CreatePregnancyProfileRequest(BaseModel):
    patient_id: Optional[UUID] = Field(None, description="ID bệnh nhân thai phụ (Bắt buộc nếu người gọi là Doctor)")
    primary_doctor_id: Optional[UUID] = Field(None, description="ID bác sĩ phụ trách chính")
    calculation_method: Literal["lmp", "q1_ultrasound", "crl", "direct_edd"] = Field(
        "lmp", description="Phương pháp tính toán ban đầu: 'lmp', 'q1_ultrasound', 'crl', 'direct_edd'"
    )
    lmp: Optional[date] = Field(None, description="Ngày đầu kỳ kinh cuối (YYYY-MM-DD)")
    q1_ultrasound_date: Optional[date] = Field(None, description="Ngày thực hiện siêu âm quý 1")
    q1_gestational_weeks: Optional[int] = Field(None, ge=0, le=42, description="Tuổi thai (tuần) lúc siêu âm Q1")
    q1_gestational_days: Optional[int] = Field(None, ge=0, le=6, description="Số ngày lẻ (0-6) lúc siêu âm Q1")
    crl_mm: Optional[Decimal] = Field(None, gt=0, le=120.0, description="Chiều dài đầu mông CRL tính bằng mm")
    override_edd: Optional[date] = Field(None, description="Ngày dự sinh bác sĩ chỉ định trực tiếp")

    @model_validator(mode="after")
    def validate_create_rules(self):
        today = date.today()
        if self.lmp:
            if self.lmp > today:
                raise ValueError("Ngày kinh cuối không hợp lệ hoặc vượt quá thời gian mang thai.")
            if (today - self.lmp).days > 300:
                raise ValueError("Ngày kinh cuối không hợp lệ hoặc vượt quá thời gian mang thai.")

        if self.q1_ultrasound_date:
            if self.q1_ultrasound_date > today:
                raise ValueError("Ngày siêu âm phải nhỏ hơn hoặc bằng ngày hôm nay.")
            if self.lmp and self.q1_ultrasound_date < self.lmp:
                raise ValueError("Ngày siêu âm không thể diễn ra trước ngày kinh cuối.")

        if self.q1_gestational_weeks is not None:
            if self.calculation_method == "q1_ultrasound" and not (6 <= self.q1_gestational_weeks <= 14):
                raise ValueError("Tuổi thai siêu âm quý 1 phải nằm trong khoảng 6 - 14 tuần.")

        if self.crl_mm is not None:
            if self.calculation_method == "crl" and not (10.0 <= float(self.crl_mm) <= 84.0):
                raise ValueError("Chỉ số CRL đo tuổi thai quý 1 tiêu chuẩn từ 10mm đến 84mm.")

        # Kiểm tra logic theo phương pháp tính
        if self.calculation_method == "lmp" and not self.lmp:
            raise ValueError("Vui lòng cung cấp ngày kinh cuối (LMP) khi chọn phương pháp tính theo kỳ kinh.")
        elif self.calculation_method == "q1_ultrasound" and not (self.q1_ultrasound_date and self.q1_gestational_weeks is not None):
            raise ValueError("Vui lòng cung cấp ngày siêu âm và tuần tuổi thai siêu âm quý 1.")
        elif self.calculation_method == "crl" and not (self.q1_ultrasound_date and self.crl_mm is not None):
            raise ValueError("Vui lòng cung cấp ngày siêu âm và chỉ số chiều dài đầu mông (CRL).")
        elif self.calculation_method == "direct_edd" and not self.override_edd:
            raise ValueError("Vui lòng cung cấp ngày dự sinh (override_edd) khi chọn phương pháp chỉ định trực tiếp.")

        return self


class UpdatePregnancyProfileRequest(BaseModel):
    primary_doctor_id: Optional[UUID] = Field(None, description="ID bác sĩ phụ trách chính")
    lmp: Optional[date] = Field(None, description="Ngày đầu kỳ kinh cuối")
    q1_ultrasound_date: Optional[date] = Field(None, description="Ngày siêu âm quý 1")
    q1_gestational_weeks: Optional[int] = Field(None, ge=0, le=42, description="Tuổi thai (tuần) lúc siêu âm Q1")
    q1_gestational_days: Optional[int] = Field(None, ge=0, le=6, description="Số ngày lẻ (0-6) lúc siêu âm Q1")
    crl_mm: Optional[Decimal] = Field(None, gt=0, le=120.0, description="Chiều dài đầu mông CRL (mm)")
    recalculate_edd: Optional[bool] = Field(False, description="Chạy lại bộ quy tắc lâm sàng ACOG để chuẩn hóa lại EDD")
    override_edd: Optional[date] = Field(None, description="Ngày dự sinh bác sĩ chỉ định trực tiếp")

    @model_validator(mode="after")
    def validate_update_rules(self):
        today = date.today()
        if self.lmp:
            if self.lmp > today:
                raise ValueError("Ngày kinh cuối không hợp lệ hoặc vượt quá thời gian mang thai.")
            if (today - self.lmp).days > 300:
                raise ValueError("Ngày kinh cuối không hợp lệ hoặc vượt quá thời gian mang thai.")

        if self.q1_ultrasound_date:
            if self.q1_ultrasound_date > today:
                raise ValueError("Ngày siêu âm phải nhỏ hơn hoặc bằng ngày hôm nay.")
            if self.lmp and self.q1_ultrasound_date < self.lmp:
                raise ValueError("Ngày siêu âm không thể diễn ra trước ngày kinh cuối.")

        return self


class UpdatePregnancyProfileStatusRequest(BaseModel):
    status: Literal["active", "completed", "terminated"] = Field(..., description="Trạng thái hồ sơ mới")
    reason: Optional[str] = Field(None, description="Lý do cập nhật trạng thái")


# ==========================================
# 5. Response Models for Pregnancy Profile
# ==========================================

class PregnancyProfileCreatedData(BaseModel):
    id: UUID
    patient_id: UUID
    primary_doctor_id: Optional[UUID] = None
    lmp: Optional[date] = None
    q1_ultrasound_date: Optional[date] = None
    q1_gestational_weeks: Optional[int] = None
    q1_gestational_days: Optional[int] = None
    crl_mm: Optional[float] = None
    edd: date
    status: str
    current_gestational_age: GestationalAgeDetail
    created_at: datetime
    updated_at: datetime


class CreatePregnancyProfileResponse(BaseModel):
    success: bool = True
    data: PregnancyProfileCreatedData
    message: str = "Khởi tạo hồ sơ thai kỳ thành công"


class ActivePregnancyProfileData(BaseModel):
    id: UUID
    patient: PatientSummary
    primary_doctor: Optional[DoctorSummary] = None
    lmp: Optional[date] = None
    q1_ultrasound_date: Optional[date] = None
    q1_gestational_weeks: Optional[int] = None
    q1_gestational_days: Optional[int] = None
    crl_mm: Optional[float] = None
    edd: date
    status: str
    current_gestational_age: GestationalAgeDetail
    created_at: datetime
    updated_at: datetime


class ActivePregnancyProfileResponse(BaseModel):
    success: bool = True
    data: ActivePregnancyProfileData


class PregnancyProfileDetailData(BaseModel):
    id: UUID
    patient: PatientSummary
    primary_doctor: Optional[DoctorSummary] = None
    lmp: Optional[date] = None
    q1_ultrasound_date: Optional[date] = None
    q1_gestational_weeks: Optional[int] = None
    q1_gestational_days: Optional[int] = None
    crl_mm: Optional[float] = None
    edd: date
    status: str
    target_date: Optional[date] = None
    current_gestational_age: GestationalAgeDetail
    created_at: datetime
    updated_at: datetime


class PregnancyProfileDetailResponse(BaseModel):
    success: bool = True
    data: PregnancyProfileDetailData
    message: str = "Lấy chi tiết hồ sơ thai kỳ thành công"


class PregnancyProfileListItemContract(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: str
    patient_phone: Optional[str] = None
    primary_doctor_name: Optional[str] = None
    edd: date
    status: str
    current_gestational_age_formatted: str
    created_at: datetime


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class PregnancyProfileListContractData(BaseModel):
    items: List[PregnancyProfileListItemContract]
    pagination: PaginationMeta


class PregnancyProfileListContractResponse(BaseModel):
    success: bool = True
    data: PregnancyProfileListContractData


class UpdateStatusData(BaseModel):
    id: UUID
    status: str
    updated_at: datetime


class UpdateStatusResponse(BaseModel):
    success: bool = True
    data: UpdateStatusData
    message: str = "Cập nhật trạng thái hồ sơ thành công"


# Tương thích với các model cũ nếu có code khác dùng
class PregnancyProfileListItem(BaseModel):
    id: UUID
    patient: PatientSummary
    primary_doctor: Optional[DoctorSummary] = None
    edd: date
    gestational_age: GestationalAgeDetail
    status: str
    lmp: Optional[date] = None
    q1_ultrasound_date: Optional[date] = None
    crl_mm: Optional[Decimal] = None
    last_checkup_date: Optional[date] = None
    created_at: datetime


class PregnancyProfileListResponse(BaseModel):
    success: bool = True
    total: int
    data: List[PregnancyProfileListItem]
    message: str = "Lấy danh sách hồ sơ thai kỳ thành công"


class EligiblePatientsResponse(BaseModel):
    success: bool = True
    total: int
    data: List[PatientSummary]
    message: str = "Lấy danh sách thai phụ chưa có hồ sơ thai kỳ thành công"
