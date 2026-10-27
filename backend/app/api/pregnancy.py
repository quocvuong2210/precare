# backend/app/api/pregnancy.py
from fastapi import APIRouter, HTTPException, status
from app.schemas.pregnancy_profile import (
    CalculateGestationalAgeRequest,
    CalculateGestationalAgeResponse
)
from app.services.pregnancy_calculator import calculate_gestational_age_engine

router = APIRouter()

@router.post(
    "/calculate",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Utility Engine tính nháp tuổi thai gt & EDD"
)
def calculate_preview(payload: CalculateGestationalAgeRequest):
    try:
        result = calculate_gestational_age_engine(payload)
        return {
            "success": True,
            "data": result.model_dump()
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "CLINICAL_VALIDATION_ERROR", "message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": f"Lỗi tính toán tuổi thai: {str(e)}"}
        )