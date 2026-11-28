export type BiometricMetric = 'crl' | 'bpd' | 'hc' | 'ac' | 'fl' | 'efw';
export type GrowthStandard = 'intergrowth_21st' | 'hadlock';

export interface GrowthReferencePoint {
  id: string;
  standard: GrowthStandard | string;
  metric: BiometricMetric | string;
  ga_days: number;
  l_value: number;
  m_value: number;
  s_value: number;
  p3: number;
  p10: number;
  p50: number;
  p90: number;
  p97: number;
  unit: string;
  version: string;
}

export interface TrajectoryPoint {
  biometric_data_id: string;
  checkup_id: string;
  checkup_date: string | null;
  ga_days: number;
  ga_formatted: string;
  value: number;
  z_score: number | null;
  percentile: number | null;
  classification: string | null;
  warning_level: 'green' | 'yellow' | 'red' | string | null;
  delta_from_median: number | null;
  delta_from_median_pct: number | null;
  delta_value_from_prev: number | null;
  delta_ga_days_from_prev: number | null;
  growth_velocity_per_week: number | null;
  delta_percentile_from_prev: number | null;
  is_trajectory_drop_alert: boolean;
}

export interface TrajectorySummary {
  total_points: number;
  latest_ga_days: number | null;
  latest_value: number | null;
  latest_percentile: number | null;
  latest_z_score: number | null;
  overall_delta_value: number | null;
  overall_delta_percentile: number | null;
  has_trajectory_drop_alert: boolean;
}

export interface TrajectoryResponse {
  pregnancy_profile_id: string;
  patient_id: string;
  metric: BiometricMetric;
  standard: GrowthStandard;
  unit: string;
  lms_version: string;
  measurements: TrajectoryPoint[];
  summary: TrajectorySummary;
  lms_curve: GrowthReferencePoint[];
}
