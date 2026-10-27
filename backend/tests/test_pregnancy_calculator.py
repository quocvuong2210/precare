from datetime import date
from app.services.pregnancy_calculator import calculate_pregnancy_dates, calculate_ga_from_crl

def test_lmp_calculation():
    # LMP: 2026-06-01 -> EDD = 2026-06-01 + 280 ngày = 2027-03-08
    lmp = date(2026, 6, 1)
    target = date(2026, 10, 18)
    edd, ga_days, method, _ = calculate_pregnancy_dates(target_date=target, lmp=lmp)
    assert edd == date(2027, 3, 8)
    assert ga_days == 139  # 19w6d
    assert method == "lmp"

def test_crl_formula():
    # CRL 47.5mm tương đương ~11 tuần (77 ngày)
    ga_days = calculate_ga_from_crl(47.5)
    assert 76 <= ga_days <= 79