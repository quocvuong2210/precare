# backend/app/services/pregnancy_calculator.py
import math
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Tuple
from app.schemas.pregnancy_profile import (
    GestationalAgeDetail,
    CalculateGestationalAgeRequest,
    CalculateGestationalAgeResponse
)

def calculate_ga_from_crl(crl_mm: float) -> int:
    """
    Ước tính tuổi thai (ngày) từ chiều dài đầu mông CRL (mm)
    Công thức Robinson & Fleming / Hadlock:
    GA_days = 8.052 * sqrt(crl_mm * 1.037) + 23.73
    """
    days = 8.052 * math.sqrt(crl_mm) + 23.73
    return round(days)

def format_gestational_age(ga_days: int, target_date: date, edd: date) -> GestationalAgeDetail:
    """
    Chuẩn hóa biểu diễn tuổi thai và xác định tam cá nguyệt (Trimester)
    """
    weeks = ga_days // 7
    remaining_days = ga_days % 7
    formatted = f"{weeks}w{remaining_days}d"
    
    # Phân loại tam cá nguyệt
    if ga_days <= 97:  # 0w0d đến 13w6d
        trimester = 1
        trimester_name = "Tam cá nguyệt thứ 1 (3 tháng đầu)"
    elif ga_days <= 195:  # 14w0d đến 27w6d
        trimester = 2
        trimester_name = "Tam cá nguyệt thứ 2 (3 tháng giữa)"
    else:  # >= 28w0d
        trimester = 3
        trimester_name = "Tam cá nguyệt thứ 3 (3 tháng cuối)"

    days_until_edd = (edd - target_date).days

    return GestationalAgeDetail(
        days=ga_days,
        weeks=weeks,
        remaining_days=remaining_days,
        formatted=formatted,
        trimester=trimester,
        trimester_name=trimester_name,
        days_until_edd=days_until_edd
    )

def calculate_pregnancy_dates(
    target_date: Optional[date] = None,
    lmp: Optional[date] = None,
    q1_ultrasound_date: Optional[date] = None,
    q1_gestational_weeks: Optional[int] = None,
    q1_gestational_days: Optional[int] = 0,
    crl_mm: Optional[Decimal] = None,
    override_edd: Optional[date] = None
) -> Tuple[date, int, str, str]:
    """
    Tính toán EDD và tuổi thai (ga_days) tại ngày target_date theo hướng dẫn ACOG No. 700.
    
    Returns:
        (edd, ga_days_at_target, primary_method, clinical_note)
    """
    if target_date is None:
        target_date = date.today()

    # TH 4: Bác sĩ chỉ định EDD thủ công
    if override_edd is not None:
        edd = override_edd
        # gt = 280 - (EDD - T)
        ga_days = 280 - (edd - target_date).days
        return edd, ga_days, "direct_edd", "Ngày dự sinh được bác sĩ chỉ định trực tiếp."

    # 1. Tính toán theo LMP nếu có
    edd_lmp: Optional[date] = None
    if lmp is not None:
        edd_lmp = lmp + timedelta(days=280)

    # 2. Tính toán theo Siêu âm Quý 1 nếu có
    edd_q1: Optional[date] = None
    ga_at_q1: Optional[int] = None
    used_crl = False

    if q1_ultrasound_date is not None:
        if q1_gestational_weeks is not None:
            ga_at_q1 = (q1_gestational_weeks * 7) + (q1_gestational_days or 0)
        elif crl_mm is not None:
            ga_at_q1 = calculate_ga_from_crl(float(crl_mm))
            used_crl = True
        
        if ga_at_q1 is not None:
            # EDD_Q1 = q1_date + (280 - GA_Q1)
            edd_q1 = q1_ultrasound_date + timedelta(days=(280 - ga_at_q1))

    # TH 1: Chỉ có LMP
    if edd_lmp is not None and edd_q1 is None:
        edd = edd_lmp
        ga_days = (target_date - lmp).days
        return edd, ga_days, "lmp", "Tính theo ngày đầu kỳ kinh cuối (LMP - Quy tắc Naegele)."

    # TH 2: Chỉ có Siêu âm Quý 1
    if edd_q1 is not None and edd_lmp is None:
        edd = edd_q1
        # gt = GA_Q1 + (T - q1_date)
        ga_days = ga_at_q1 + (target_date - q1_ultrasound_date).days
        method = "crl" if used_crl else "q1_ultrasound"
        return edd, ga_days, method, "Tính theo Siêu âm Quý 1 (Chuẩn vàng khi không rõ LMP)."

    # TH 3: Có cả LMP và Siêu âm Quý 1 -> Áp dụng luật ACOG
    if edd_lmp is not None and edd_q1 is not None and ga_at_q1 is not None:
        delta_days = abs((edd_lmp - edd_q1).days)
        q1_method = "crl" if used_crl else "q1_ultrasound"

        # Tuổi thai <= 8w6d (<= 62 ngày)
        if ga_at_q1 <= 62:
            if delta_days > 5:
                edd = edd_q1
                ga_days = ga_at_q1 + (target_date - q1_ultrasound_date).days
                note = f"Chênh lệch giữa LMP và Siêu âm Q1 là {delta_days} ngày (> 5 ngày ở tuổi thai ≤ 8w6d). Ưu tiên Siêu âm Q1 theo ACOG."
                return edd, ga_days, q1_method, note
            else:
                edd = edd_lmp
                ga_days = (target_date - lmp).days
                note = f"Chênh lệch giữa LMP và Siêu âm Q1 là {delta_days} ngày (≤ 5 ngày). Đạt tiêu chuẩn đồng thuận lâm sàng, giữ theo LMP."
                return edd, ga_days, "lmp", note

        # Tuổi thai 9w0d - 13w6d (63 đến 97 ngày)
        elif ga_at_q1 <= 97:
            if delta_days > 7:
                edd = edd_q1
                ga_days = ga_at_q1 + (target_date - q1_ultrasound_date).days
                note = f"Chênh lệch giữa LMP và Siêu âm Q1 là {delta_days} ngày (> 7 ngày ở tuổi thai 9w0d - 13w6d). Ưu tiên Siêu âm Q1 theo ACOG."
                return edd, ga_days, q1_method, note
            else:
                edd = edd_lmp
                ga_days = (target_date - lmp).days
                note = f"Chênh lệch giữa LMP và Siêu âm Q1 là {delta_days} ngày (≤ 7 ngày). Đạt tiêu chuẩn đồng thuận lâm sàng, giữ theo LMP."
                return edd, ga_days, "lmp", note
        else:
            # Siêu âm sau 13w6d: Nếu lệch > 7 ngày thì ưu tiên siêu âm
            if delta_days > 7:
                edd = edd_q1
                ga_days = ga_at_q1 + (target_date - q1_ultrasound_date).days
                return edd, ga_days, q1_method, f"Chênh lệch {delta_days} ngày (> 7 ngày). Chọn ngày theo siêu âm."
            else:
                edd = edd_lmp
                ga_days = (target_date - lmp).days
                return edd, ga_days, "lmp", f"Chênh lệch {delta_days} ngày (≤ 7 ngày). Chọn ngày theo LMP."

    raise ValueError("Không đủ dữ liệu hợp lệ để tính tuổi thai và ngày dự sinh.")

def calculate_gestational_age_engine(req: CalculateGestationalAgeRequest) -> CalculateGestationalAgeResponse:
    """
    Hàm Wrapper chính tiếp nhận Pydantic request và trả về CalculateGestationalAgeResponse
    """
    target = req.target_date or date.today()
    edd, ga_days, method, note = calculate_pregnancy_dates(
        target_date=target,
        lmp=req.lmp,
        q1_ultrasound_date=req.q1_ultrasound_date,
        q1_gestational_weeks=req.q1_gestational_weeks,
        q1_gestational_days=req.q1_gestational_days,
        crl_mm=req.crl_mm,
        override_edd=req.override_edd
    )

    ga_detail = format_gestational_age(ga_days, target, edd)

    return CalculateGestationalAgeResponse(
        target_date=target,
        calculated_edd=edd,
        primary_method=method,
        clinical_note=note,
        gestational_age=ga_detail,
        days_until_edd=ga_detail.days_until_edd
    )