import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.audit import log_audit_event
from app.models.models import User, PregnancyProfile, Checkup, BiometricData, AnalysisResult
from app.schemas.schemas import (
    PregnancyProfileCreate, PregnancyProfileResponse, CheckupCreate, CheckupResponse
)

router = APIRouter(prefix="/records", tags=["Records"])

def calculate_edd_and_ga(
    lmp: Optional[date],
    q1_date: Optional[date],
    q1_weeks: Optional[int],
    q1_days: Optional[int]
) -> tuple[date, int]:
    """
    Calculates Estimated Due Date (EDD) and current Gestational Age (GA in days).
    Uses First Trimester Ultrasound priority if available, falling back to Naegele's rule on LMP.
    """
    today = date.today()
    if q1_date and q1_weeks is not None:
        q1_ga_total_days = (q1_weeks * 7) + (q1_days or 0)
        # EDD is 280 days total gestational age
        conception_estimate = q1_date - timedelta(days=q1_ga_total_days)
        edd = conception_estimate + timedelta(days=280)
        current_ga_days = (today - conception_estimate).days
        return edd, max(0, current_ga_days)

    if lmp:
        edd = lmp + timedelta(days=280)
        current_ga_days = (today - lmp).days
        return edd, max(0, current_ga_days)

    raise ValueError("Bắt buộc phải cung cấp ngày Kinh Cuối (LMP) hoặc Siêu Âm Quý 1 để tính tuổi thai.")

@router.post("/profiles", response_model=PregnancyProfileResponse)
def create_pregnancy_profile(
    req: PregnancyProfileCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["doctor", "admin"]))
):
    try:
        edd, _ = calculate_edd_and_ga(req.lmp, req.q1_ultrasound_date, req.q1_gestational_weeks, req.q1_gestational_days)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    profile = PregnancyProfile(
        patient_id=req.patient_id,
        primary_doctor_id=req.primary_doctor_id or current_user.id,
        lmp=req.lmp,
        q1_ultrasound_date=req.q1_ultrasound_date,
        q1_gestational_weeks=req.q1_gestational_weeks,
        q1_gestational_days=req.q1_gestational_days,
        edd=edd
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    log_audit_event(db, current_user.id, "CREATE", "pregnancy_profiles", profile.id, request)
    return profile

@router.get("/profiles/patient/{patient_id}", response_model=List[PregnancyProfileResponse])
def get_patient_profiles(
    patient_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profiles = db.query(PregnancyProfile).filter(PregnancyProfile.patient_id == patient_id).all()
    if profiles:
        log_audit_event(db, current_user.id, "READ", "pregnancy_profiles", profiles[0].id, request)
    return profiles

@router.post("/checkups", response_model=CheckupResponse)
def create_checkup(
    req: CheckupCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["doctor", "admin"]))
):
    checkup = Checkup(
        pregnancy_profile_id=req.pregnancy_profile_id,
        doctor_id=current_user.id,
        checkup_date=req.checkup_date,
        gestational_age_days=req.gestational_age_days,
        weight_kg=req.weight_kg,
        blood_pressure_systolic=req.blood_pressure_systolic,
        blood_pressure_diastolic=req.blood_pressure_diastolic,
        notes=req.notes
    )
    db.add(checkup)
    db.commit()
    db.refresh(checkup)

    log_audit_event(db, current_user.id, "CREATE", "checkups", checkup.id, request)
    return checkup
