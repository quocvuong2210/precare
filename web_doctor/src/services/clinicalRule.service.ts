import { apiClient } from './auth.service';
import { AnalysisResult, ClinicalRuleEvaluateRequest } from '../types';

export async function evaluateBiometricRulesApi(
  payload: ClinicalRuleEvaluateRequest,
): Promise<AnalysisResult> {
  const response = await apiClient.post<AnalysisResult>(
    '/api/v1/clinical-rules/evaluate',
    payload,
  );
  return response.data;
}

export async function fetchProfileRuleEvaluationsApi(
  pregnancyProfileId: string,
): Promise<AnalysisResult[]> {
  const response = await apiClient.get<AnalysisResult[]>(
    `/api/v1/clinical-rules/pregnancy-profile/${pregnancyProfileId}`,
  );
  return response.data;
}
