# backend/app/schemas/pregnancy_profile.py
from datetime import date
from typing import Optional, Literal
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator

class GestationalAgeDetail(BaseModel):
    days: int = Field(..., description="Tổng số ngày tuổi thai (gt)")
    weeks: int = Field(..., description="Số tuần thai")
    remaining_days: int = Field(..., description="Số ngày lẻ còn lại (0-6)")
    formatted: str = Field(..., description="Ví dụ: 19w6d")
    trimester: int = Field(..., description="Tam cá nguyệt (1, 2 hoặc 3)")
    trimester_name: str = Field(..., description="Tên tam cá nguyệt")
    days_until_edd: int = Field(..., description="Số ngày đếm ngược đến ngày sinh")

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