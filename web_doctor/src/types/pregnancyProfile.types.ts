/**
 * STORY-3.1: Pregnancy Profile Types & Contracts
 * Đồng bộ chính xác với API Contract: API_Contract_STORY-3.1_Pregnancy_Profile.md
 */

export type PregnancyStatus = 'active' | 'completed' | 'terminated';

export type CalculationMethod = 'lmp' | 'q1_ultrasound' | 'crl' | 'direct_edd';

export interface GestationalAgeDetail {
  days: number;
  weeks: number;
  remaining_days?: number;
  remainingDays?: number;
  formatted: string;
  trimester: 1 | 2 | 3;
  trimester_name?: string;
  trimester_description?: string;
  days_until_edd?: number;
  daysUntilEdd?: number;
}

export interface PatientSummary {
  id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
}

export interface DoctorSummary {
  id: string;
  full_name: string;
}

export interface PregnancyProfileBackend {
  id: string;
  patient_id: string;
  primary_doctor_id?: string | null;
  patient?: PatientSummary;
  primary_doctor?: DoctorSummary;
  patient_name?: string;
  patient_phone?: string;
  primary_doctor_name?: string;
  lmp?: string | null;
  q1_ultrasound_date?: string | null;
  q1_gestational_weeks?: number | null;
  q1_gestational_days?: number | null;
  crl_mm?: number | null;
  edd: string;
  status: PregnancyStatus;
  current_gestational_age?: GestationalAgeDetail;
  current_gestational_age_formatted?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PregnancyProfileListItemBackend {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  primary_doctor_name?: string;
  edd: string;
  status: PregnancyStatus;
  current_gestational_age_formatted?: string;
  created_at?: string;
}

export interface PregnancyProfilesListResponseData {
  items: PregnancyProfileListItemBackend[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface CreatePregnancyProfileRequest {
  patient_id?: string;
  primary_doctor_id?: string;
  calculation_method: CalculationMethod;
  lmp?: string | null;
  q1_ultrasound_date?: string | null;
  q1_gestational_weeks?: number | null;
  q1_gestational_days?: number | null;
  crl_mm?: number | null;
  override_edd?: string | null;
}

export interface UpdatePregnancyProfileRequest {
  primary_doctor_id?: string | null;
  lmp?: string | null;
  q1_ultrasound_date?: string | null;
  q1_gestational_weeks?: number | null;
  q1_gestational_days?: number | null;
  crl_mm?: number | null;
  recalculate_edd?: boolean;
  override_edd?: string | null;
}

export interface UpdatePregnancyStatusRequest {
  status: PregnancyStatus;
  reason?: string;
}

export interface CalculateGestationalAgeRequest {
  target_date?: string;
  lmp?: string | null;
  q1_ultrasound_date?: string | null;
  q1_gestational_weeks?: number | null;
  q1_gestational_days?: number | null;
  crl_mm?: number | null;
  direct_edd?: string | null;
}

export interface CalculateGestationalAgeResponseData {
  target_date: string;
  calculated_edd: string;
  primary_method: CalculationMethod;
  clinical_note: string;
  gestational_age: {
    days: number;
    weeks: number;
    remaining_days: number;
    formatted: string;
    trimester: number;
    trimester_description?: string;
  };
  days_until_edd: number;
}

import type { ApiResponse } from './auth.types';

export type { ApiResponse };
