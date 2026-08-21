import pytest
from app.engines.model_engine import fuse_warning_levels, model_engine
from app.engines.rule_engine import RuleEngine

def test_fuse_warning_levels_matrix():
    """
    Exhaustive matrix test of fuse_warning_levels(rule_level, model_level).
    Must strictly satisfy: max(rule_level, model_level)
    """
    # Rule RED scenarios -> Output MUST ALWAYS BE RED
    assert fuse_warning_levels("red", "green") == "red"
    assert fuse_warning_levels("red", "yellow") == "red"
    assert fuse_warning_levels("red", "red") == "red"

    # Rule YELLOW scenarios -> Output MUST BE AT LEAST YELLOW
    assert fuse_warning_levels("yellow", "green") == "yellow"
    assert fuse_warning_levels("yellow", "yellow") == "yellow"
    assert fuse_warning_levels("yellow", "red") == "red"  # Elevated by ML

    # Rule GREEN scenarios -> Output follows ML elevation
    assert fuse_warning_levels("green", "green") == "green"
    assert fuse_warning_levels("green", "yellow") == "yellow"
    assert fuse_warning_levels("green", "red") == "red"

def test_clinical_red_flag_override_by_rule_engine():
    """
    Scenario: EFW < 3rd percentile triggers Clinical RED FLAG.
    ML model predicts GREEN.
    Expected: Final warning level MUST BE RED. (ML Model CANNOT lower clinical red flag).
    """
    # GA 30 weeks (210 days). Hadlock expected EFW is 1690g (SD = 202.8g).
    # Passing EFW = 600g (severely low, Z = -5.37, < 3rd percentile -> RED)
    res = model_engine.predict(
        gestational_age_days=210,
        efw=600.0,
        simulated_model_level="green",
        simulated_model_risk=0.01
    )

    assert res["rule_result"]["warning_level"] == "red"
    assert res["raw_model_level"] == "green"
    assert res["final_warning_level"] == "red", "FAILED: ML model incorrectly downgraded clinical RED flag!"

def test_clinical_yellow_flag_override():
    """
    Scenario: EFW < 10th percentile triggers Clinical YELLOW FLAG.
    ML model predicts GREEN.
    Expected: Final warning level MUST BE YELLOW.
    """
    # GA 30 weeks (210 days). Hadlock expected EFW 1690g (SD = 202.8g).
    # Passing EFW = 1400g (Z = -1.43, ~7.6th percentile -> YELLOW)
    res = model_engine.predict(
        gestational_age_days=210,
        efw=1400.0,
        simulated_model_level="green",
        simulated_model_risk=0.02
    )

    assert res["rule_result"]["warning_level"] == "yellow"
    assert res["raw_model_level"] == "green"
    assert res["final_warning_level"] == "yellow", "FAILED: ML model incorrectly downgraded clinical YELLOW flag!"

def test_ml_model_elevation_from_green_to_red():
    """
    Scenario: Clinical measurements are normal (GREEN).
    ML model detects subtle anomaly (RED).
    Expected: Final warning level IS ELEVATED TO RED.
    """
    # GA 30 weeks (210 days). EFW = 1690g (Expected 50th percentile -> GREEN)
    res = model_engine.predict(
        gestational_age_days=210,
        efw=1690.0,
        simulated_model_level="red",
        simulated_model_risk=0.92
    )

    assert res["rule_result"]["warning_level"] == "green"
    assert res["raw_model_level"] == "red"
    assert res["final_warning_level"] == "red", "FAILED: ML model elevation to RED did not take effect!"
