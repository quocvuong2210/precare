from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import date, datetime
import uuid

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: str = Field("pregnant_woman", description="doctor, pregnant_woman, admin")
    phone_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    role: str
    full_name: str

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    phone_number: Optional[str]
    is_active: bool
    created_at: datetime

# Pregnancy Profile Schemas
class PregnancyProfileCreate(BaseModel):
    patient_id: uuid.UUID
    primary_doctor_id: Optional[uuid.UUID] = None
    lmp: Optional[date] = None
    q1_ultrasound_date: Optional[date] = None
    q1_gestational_weeks: Optional[int] = None
    q1_gestational_days: Optional[int] = None
    edd: Optional[date] = None  # Estimated Due Date

class PregnancyProfileResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    primary_doctor_id: Optional[uuid.UUID]
    lmp: Optional[date]
    q1_ultrasound_date: Optional[date]
    q1_gestational_weeks: Optional[int]
    q1_gestational_days: Optional[int]
    edd: date
    status: str
    created_at: datetime

# Checkup Schemas
class CheckupCreate(BaseModel):
    pregnancy_profile_id: uuid.UUID
    checkup_date: date
    gestational_age_days: int
    weight_kg: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    notes: Optional[str] = None

class CheckupResponse(BaseModel):
    id: uuid.UUID
    pregnancy_profile_id: uuid.UUID
    doctor_id: uuid.UUID
    checkup_date: date
    gestational_age_days: int
    weight_kg: Optional[float]
    blood_pressure_systolic: Optional[int]
    blood_pressure_diastolic: Optional[int]
    notes: Optional[str]

# Confirmation Barrier & Ingest Schemas
class IngestConfirmRequest(BaseModel):
    uploaded_file_id: uuid.UUID
    checkup_id: uuid.UUID
    bpd: Optional[float] = None
    hc: Optional[float] = None
    ac: Optional[float] = None
    fl: Optional[float] = None
    efw: Optional[float] = None
    user_corrections: Optional[Dict[str, Any]] = None

class BiometricDataResponse(BaseModel):
    id: uuid.UUID
    pregnancy_profile_id: uuid.UUID
    checkup_id: uuid.UUID
    uploaded_file_id: Optional[uuid.UUID]
    gestational_age_days: int
    bpd: Optional[float]
    hc: Optional[float]
    ac: Optional[float]
    fl: Optional[float]
    efw: Optional[float]
    status: str
    verified_by: Optional[uuid.UUID]

# Analysis Response Schema
class AnalysisResultResponse(BaseModel):
    id: uuid.UUID
    pregnancy_profile_id: uuid.UUID
    checkup_id: uuid.UUID
    biometric_data_id: uuid.UUID
    model_version: str
    rules_version: str
    bpd_zscore: Optional[float]
    bpd_percentile: Optional[float]
    hc_zscore: Optional[float]
    hc_percentile: Optional[float]
    ac_zscore: Optional[float]
    ac_percentile: Optional[float]
    fl_zscore: Optional[float]
    fl_percentile: Optional[float]
    efw_zscore: Optional[float]
    efw_percentile: Optional[float]
    anomaly_probability: float
    warning_level: str
    explanation_doctor: str
    explanation_patient: str
    disclaimer_text: str
    analyzed_at: datetime
