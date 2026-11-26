import { apiClient } from './auth.service';

export interface CheckupTimelineRecord {
  id: string;
  pregnancy_profile_id: string;
  doctor: { id: string; full_name: string };
  checkup_date: string;
  gestational_age: {
    days: number;
    weeks: number;
    remaining_days: number;
    formatted: string;
    trimester: number;
  };
  vitals: {
    weight_kg: number | null;
    blood_pressure_systolic: number | null;
    blood_pressure_diastolic: number | null;
    blood_pressure_status: string;
  };
  notes: string | null;
  biometric_data: {
    id: string;
    bpd: number | null;
    hc: number | null;
    ac: number | null;
    fl: number | null;
    efw: number | null;
    status: string;
  } | null;
  created_at: string;
}

export interface CreateCheckupPayload {
  pregnancy_profile_id: string;
  checkup_date: string;
  weight_kg?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  notes?: string | null;
  biometrics?: {
    bpd?: number | null;
    hc?: number | null;
    ac?: number | null;
    fl?: number | null;
    efw?: number | null;
  } | null;
}

export async function fetchCheckupHistory(profileId: string): Promise<CheckupTimelineRecord[]> {
  const response = await apiClient.get<{ success: boolean; data: CheckupTimelineRecord[] }>(
    `/checkups/pregnancy-profile/${profileId}`
  );
  return response.data.data || [];
}

export async function createCheckup(payload: CreateCheckupPayload): Promise<CheckupTimelineRecord> {
  const response = await apiClient.post<{ success: boolean; data: CheckupTimelineRecord }>(
    '/checkups',
    payload
  );
  return response.data.data;
}
