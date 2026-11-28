import api from './api';
import {
  BiometricMetric,
  GrowthStandard,
  TrajectoryResponse,
} from '../types/trajectory.types';

export interface FetchTrajectoryOptions {
  metric?: BiometricMetric;
  standard?: GrowthStandard;
  version?: string;
  minGaDays?: number;
  maxGaDays?: number;
}

export async function fetchPregnancyTrajectory(
  pregnancyProfileId: string,
  options: FetchTrajectoryOptions = {}
): Promise<TrajectoryResponse> {
  const params: Record<string, string | number> = {
    metric: options.metric ?? 'efw',
    standard: options.standard ?? 'intergrowth_21st',
  };
  if (options.version) {
    params.version = options.version;
  }
  if (typeof options.minGaDays === 'number') {
    params.min_ga_days = options.minGaDays;
  }
  if (typeof options.maxGaDays === 'number') {
    params.max_ga_days = options.maxGaDays;
  }

  const response = await api.get<TrajectoryResponse>(
    `/records/${pregnancyProfileId}/trajectory`,
    { params }
  );
  return response.data;
}
