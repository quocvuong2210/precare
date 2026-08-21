"""
PreCare Analysis Microservice - Hadlock & INTERGROWTH-21st Growth Standards
References:
1. Hadlock FP, et al. Fetal growth curves using BPD, HC, AC, and FL. Radiology 1984.
2. Papageorghiou AT, et al. International standards for fetal growth: INTERGROWTH-21st Project. Lancet 2014.
"""

import math
from typing import Tuple

def get_hadlock_expected_bpd(ga_weeks: float) -> Tuple[float, float]:
    # Hadlock BPD formula (mm): ~ 14w: 28mm, 20w: 48mm, 30w: 78mm, 40w: 96mm
    expected_mm = -23.3 + (4.43 * ga_weeks) - (0.0282 * (ga_weeks ** 2))
    expected_mm = max(20.0, expected_mm)
    sd_mm = expected_mm * 0.05
    return expected_mm, sd_mm

def get_hadlock_expected_hc(ga_weeks: float) -> Tuple[float, float]:
    # Hadlock HC formula (mm): ~ 14w: 98mm, 20w: 175mm, 30w: 285mm, 40w: 340mm
    expected_mm = -17.8 + (12.58 * ga_weeks) - (0.12 * (ga_weeks ** 2))
    expected_mm = max(40.0, expected_mm)
    sd_mm = expected_mm * 0.04
    return expected_mm, sd_mm

def get_hadlock_expected_ac(ga_weeks: float) -> Tuple[float, float]:
    # Hadlock AC formula (mm): ~ 14w: 84mm, 20w: 156mm, 30w: 265mm, 40w: 360mm
    expected_mm = -38.8 + (13.97 * ga_weeks) - (0.14 * (ga_weeks ** 2))
    expected_mm = max(40.0, expected_mm)
    sd_mm = expected_mm * 0.05
    return expected_mm, sd_mm

def get_hadlock_expected_fl(ga_weeks: float) -> Tuple[float, float]:
    # Hadlock FL formula (mm): ~ 14w: 15mm, 20w: 32mm, 30w: 58mm, 40w: 76mm
    expected_mm = -18.2 + (4.57 * ga_weeks) - (0.033 * (ga_weeks ** 2))
    expected_mm = max(10.0, expected_mm)
    sd_mm = expected_mm * 0.05
    return expected_mm, sd_mm

def get_hadlock_expected_efw(ga_weeks: float) -> Tuple[float, float]:
    # Hadlock EFW mean equation (grams): EFW = 0.09 * (GA ^ 2.9)
    # GA 20w ~ 517g, GA 28w ~ 1380g, GA 30w ~ 1690g, GA 32w ~ 2048g, GA 36w ~ 2912g, GA 40w ~ 3951g
    expected_grams = 0.09 * (ga_weeks ** 2.9)
    sd_grams = expected_grams * 0.12  # ~12% SD
    return max(50.0, expected_grams), max(10.0, sd_grams)
