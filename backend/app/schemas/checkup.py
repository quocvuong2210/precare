from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, model_validator


class GestationalAgeInfo(BaseModel):
    days: int = Field(..., description="Tổng số ngày tuổi thai (gt)")
    weeks: int = Field(..., description="Số tuần thai")
    remaining_days: int = Field(..., description="Số ngày lẻ (0-6)")
    formatted: str = Field(..., description="Ví dụ: 21w3d")
    trimester: int = Field(..., description="Tam cá nguyệt (1, 2, 3)")


class MaternalVitalsInput(BaseModel):
    weight_kg: Optional[float] = Field(None, ge=30.0, le=200.0, description="Cân nặng mẹ bầu (kg)")
    blood_pressure_systolic: Optional[int] = Field(None, ge=60, le=250, description="Huyết áp tâm thu (mmHg)")
    blood_pressure_diastolic: Optional[int] = Field(None, ge=40, le=150, description="Huyết áp tâm trương (mmHg)")

    @model_validator(mode="after")
    def validate_blood_pressure(self):
        sys = self.blood_pressure_systolic
        dia = self.blood_pressure_diastolic
        if (sys is not None and dia is None) or (sys is None and dia is not None):
            raise ValueError("Cần cung cấp đồng thời cả huyết áp tâm thu và tâm trương.")
        if sys is not None and dia is not None:
            if sys <= dia:
                raise ValueError("Huyết áp tâm thu phải lớn hơn huyết áp tâm trương.")
        return self


class BiometricsInput(BaseModel):
    bpd: Optional[float] = Field(None, ge=10.0, le=120.0, description="Đường kính lưỡng đỉnh (mm)")
    hc: Optional[float] = Field(None, ge=50.0, le=400.0, description="Chu vi vòng đầu (mm)")
    ac: Optional[float] = Field(None, ge=50.0, le=450.0, description="Chu vi vòng bụng (mm)")
    fl: Optional[float] = Field(None, ge=5.0, le=95.0, description="Chiều dài xương đùi (mm)")
    efw: Optional[float] = Field(None, ge=50.0, le=6000.0, description="Cân nặng ước tính (gram)")


class CreateCheckupRequest(BaseModel):
    pregnancy_profile_id: UUID = Field(..., description="ID hồ sơ thai kỳ")
    checkup_date: date = Field(..., description="Ngày khám bệnh (YYYY-MM-DD)")
    weight_kg: Optional[float] = Field(None, ge=30.0, le=200.0)
    blood_pressure_systolic: Optional[int] = Field(None, ge=60, le=250)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=40, le=150)
    notes: Optional[str] = Field(None, description="Lời dặn hoặc chẩn đoán sơ bộ")
    biometrics: Optional[BiometricsInput] = Field(None, description="Chỉ số siêu âm thai nhi")

    @model_validator(mode="after")
    def validate_all(self):
        if self.checkup_date > date.today():
            raise ValueError("Ngày khám không được ở tương lai.")
        sys = self.blood_pressure_systolic
        dia = self.blood_pressure_diastolic
        if (sys is not None and dia is None) or (sys is None and dia is not None):
            raise ValueError("Cần cung cấp đồng thời cả huyết áp tâm thu và tâm trương.")
        if sys is not None and dia is not None and sys <= dia:
            raise ValueError("Chỉ số huyết áp không hợp lệ (Tâm thu phải > Tâm trương).")
        return self


# Response Schemas theo API Contract
class DoctorSummary(BaseModel):
    id: UUID
    full_name: str


class MaternalVitalsResponse(BaseModel):
    weight_kg: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    blood_pressure_status: str = "normal"  # normal, elevated, stage1_hypertension, crisis


class BiometricDataResponse(BaseModel):
    id: UUID
    bpd: Optional[float] = None
    hc: Optional[float] = None
    ac: Optional[float] = None
    fl: Optional[float] = None
    efw: Optional[float] = None
    status: str


class CheckupDetailData(BaseModel):
    id: UUID
    pregnancy_profile_id: UUID
    doctor: DoctorSummary
    checkup_date: date
    gestational_age: GestationalAgeInfo
    vitals: MaternalVitalsResponse
    notes: Optional[str] = None
    biometric_data: Optional[BiometricDataResponse] = None
    created_at: datetime


class CheckupResponse(BaseModel):
    success: bool = True
    data: CheckupDetailData
    message: str = "Ghi nhận lần khám thành công"