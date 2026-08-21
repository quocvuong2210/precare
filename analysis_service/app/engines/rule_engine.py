import math
from typing import Dict, Any, Optional
from scipy.stats import norm
from app.core.constants import (
    get_hadlock_expected_bpd,
    get_hadlock_expected_hc,
    get_hadlock_expected_ac,
    get_hadlock_expected_fl,
    get_hadlock_expected_efw
)
from app.core.config import settings

def calculate_zscore_and_percentile(val: Optional[float], expected: float, sd: float) -> tuple[Optional[float], Optional[float]]:
    if val is None or val <= 0:
        return None, None
    z_score = (val - expected) / sd
    percentile = norm.cdf(z_score) * 100.0
    return round(float(z_score), 2), round(float(percentile), 2)

class RuleEngine:
    def __init__(self, version: str = settings.RULE_VERSION):
        self.version = version

    def analyze(
        self,
        gestational_age_days: int,
        bpd: Optional[float] = None,
        hc: Optional[float] = None,
        ac: Optional[float] = None,
        fl: Optional[float] = None,
        efw: Optional[float] = None
    ) -> Dict[str, Any]:
        ga_weeks = gestational_age_days / 7.0

        # Calculate expected values and SDs
        exp_bpd, sd_bpd = get_hadlock_expected_bpd(ga_weeks)
        exp_hc, sd_hc = get_hadlock_expected_hc(ga_weeks)
        exp_ac, sd_ac = get_hadlock_expected_ac(ga_weeks)
        exp_fl, sd_fl = get_hadlock_expected_fl(ga_weeks)
        exp_efw, sd_efw = get_hadlock_expected_efw(ga_weeks)

        # Z-scores & percentiles
        bpd_z, bpd_p = calculate_zscore_and_percentile(bpd, exp_bpd, sd_bpd)
        hc_z, hc_p = calculate_zscore_and_percentile(hc, exp_hc, sd_hc)
        ac_z, ac_p = calculate_zscore_and_percentile(ac, exp_ac, sd_ac)
        fl_z, fl_p = calculate_zscore_and_percentile(fl, exp_fl, sd_fl)
        efw_z, efw_p = calculate_zscore_and_percentile(efw, exp_efw, sd_efw)

        # Red-Flag Clinical Rules Evaluation
        warning_level = "green"
        reasons_doctor = []
        reasons_patient = []

        # Critical Red Flags (< 3rd percentile or Z < -1.88)
        is_red = False
        if efw_p is not None and efw_p < 3.0:
            is_red = True
            reasons_doctor.append(f"CỜ ĐỎ LÂM SÀNG: Ước lượng cân nặng thai (EFW) ở bách phân vị {efw_p}% (< 3rd percentile) -> Nghi ngờ Thai chậm phát triển trong tử cung nghiêm trọng (Severe FGR).")
            reasons_patient.append("Cảnh báo quan trọng: Cân nặng thai nhi thấp hơn đáng kể so với tuổi thai (dưới bách phân vị thứ 3). Cần bác sĩ chuyên khoa đánh giá ngay.")
        elif ac_p is not None and ac_p < 3.0:
            is_red = True
            reasons_doctor.append(f"CỜ ĐỎ LÂM SÀNG: Chu vi bụng (AC) ở bách phân vị {ac_p}% (< 3rd percentile) -> Dấu hiệu suy dinh dưỡng thai nhi nghiêm trọng.")
            reasons_patient.append("Chu vi bụng của bé nhỏ hơn nhiều so với chuẩn (dưới bách phân vị thứ 3). Cần sự theo dõi sát sao từ bác sĩ.")

        if is_red:
            warning_level = "red"
        else:
            # Yellow Flags (< 10th percentile or > 97th percentile)
            is_yellow = False
            if efw_p is not None and (efw_p < 10.0 or efw_p > 97.0):
                is_yellow = True
                flag_type = "nhỏ hơn tuổi thai (SGA / FGR nhẹ)" if efw_p < 10.0 else "lớn hơn tuổi thai (LGA)"
                reasons_doctor.append(f"CẢNH BÁO LÂM SÀNG: EFW ở bách phân vị {efw_p}% -> Thai {flag_type}.")
                reasons_patient.append(f"Cân nặng thai nhi nằm ngoài khoảng trung bình ({efw_p}%). Khuyến cáo tái khám đúng hẹn.")
            elif ac_p is not None and (ac_p < 10.0 or ac_p > 97.0):
                is_yellow = True
                reasons_doctor.append(f"CẢNH BÁO LÂM SÀNG: AC ở bách phân vị {ac_p}%.")
                reasons_patient.append(f"Kích thước vòng bụng thai nhi ({ac_p}%) lệch nhẹ so với chuẩn.")
            elif any(p is not None and (p < 5.0 or p > 95.0) for p in [bpd_p, hc_p, fl_p]):
                is_yellow = True
                reasons_doctor.append("CẢNH BÁO: Kích thước sinh trắc đầu (BPD/HC) hoặc xương đùi (FL) nằm ngoài vùng bách phân vị 5% - 95%.")
                reasons_patient.append("Một số chỉ số kích thước xương hoặc vòng đầu thai nhi có sự chênh lệch so với tuổi thai.")

            if is_yellow:
                warning_level = "yellow"
            else:
                warning_level = "green"
                reasons_doctor.append("TẤT CẢ CHỈ SỐ BÌNH THƯỜNG: Các chỉ số sinh trắc (BPD, HC, AC, FL, EFW) phát triển tương ứng tuổi thai (bách phân vị 10% - 90%).")
                reasons_patient.append("Tất cả chỉ số phát triển của bé đều nằm trong giới hạn bình thường khỏe mạnh.")

        return {
            "bpd_zscore": bpd_z,
            "bpd_percentile": bpd_p,
            "hc_zscore": hc_z,
            "hc_percentile": hc_p,
            "ac_zscore": ac_z,
            "ac_percentile": ac_p,
            "fl_zscore": fl_z,
            "fl_percentile": fl_p,
            "efw_zscore": efw_z,
            "efw_percentile": efw_p,
            "warning_level": warning_level,
            "explanation_doctor": " | ".join(reasons_doctor),
            "explanation_patient": " ".join(reasons_patient),
            "rules_version": self.version
        }

rule_engine = RuleEngine()
