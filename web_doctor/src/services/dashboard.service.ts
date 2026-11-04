import axios from 'axios';
import { apiClient } from './auth.service';
import {
  ClinicalPregnancyRecord,
  DashboardMetrics,
  AnalysisServiceHealth,
} from '../types';

const ANALYSIS_API_URL =
  (import.meta as any).env?.VITE_ANALYSIS_API_URL || 'http://localhost:8001/api/v1';

export interface ClinicalRecordsResponse {
  data: ClinicalPregnancyRecord[];
  source: 'backend';
  isLiveBackend: boolean;
  message?: string;
}

export const dashboardService = {
  /**
   * Truy vấn trạng thái và phiên bản bộ luật lâm sàng từ Analysis Microservice (Port 8001)
   * Endpoint: GET /api/v1/health
   */
  async getAnalysisHealth(): Promise<AnalysisServiceHealth> {
    try {
      const response = await axios.get<AnalysisServiceHealth>(`${ANALYSIS_API_URL}/health`, {
        timeout: 4000,
      });
      if (response.data && response.data.rule_version) {
        return {
          status: response.data.status || 'healthy',
          service: response.data.service || 'PreCare-Analysis-Engine',
          rule_version: response.data.rule_version,
          model_version: '',
        };
      }
    } catch {
      // Khi Analysis service offline hoặc chưa phản hồi
    }

    return {
      status: 'offline',
      service: 'PreCare-Analysis-Engine',
      rule_version: 'Hadlock (ACOG)',
      model_version: '',
    };
  },

  /**
   * Lấy danh sách hồ sơ thai kỳ & lần khám lâm sàng thực tế từ API Gateway
   * Endpoint: GET /api/v1/pregnancy-profiles
   * Tuyệt đối không fallback dữ liệu giả khi gặp lỗi 404 hoặc mất kết nối.
   */
  async getClinicalRecords(): Promise<ClinicalRecordsResponse> {
    try {
      const res = await apiClient.get('/pregnancy-profiles', { timeout: 6000 });
      const recordsData = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      return {
        data: recordsData,
        source: 'backend',
        isLiveBackend: true,
      };
    } catch (err: any) {
      const status = err.response?.status;
      const detail =
        err.response?.data?.detail ||
        (status === 404
          ? 'Dịch vụ quản lý hồ sơ thai kỳ trên máy chủ hiện chưa sẵn sàng (404 Not Found).'
          : 'Không thể kết nối đến máy chủ API Gateway.');
      const customError: any = new Error(detail);
      customError.status = status;
      customError.response = err.response;
      throw customError;
    }
  },

  /**
   * Thống kê số liệu lâm sàng trong ngày cho các thẻ KPI và Banner chào bác sĩ
   * Chỉ tính toán động từ mảng records thực tế truyền vào.
   * Nếu không có dữ liệu (API lỗi), trả về null để UI hiển thị '--' hoặc '0'.
   */
  calculateMetrics(records?: ClinicalPregnancyRecord[] | null): DashboardMetrics | null {
    if (!records) {
      return null;
    }

    // Đếm số lượng hồ sơ duy nhất dựa trên patientId
    const uniquePatients = new Set(records.map((r) => r.patientId || r.id)).size;
    const totalPatientsManaged = uniquePatients;
    const recordsToday = records.length;
    const redAlertsToday = records.filter((r) => r.warningLevel === 'red').length;
    const verifiedToday = records.filter(
      (r) => r.ocrStatus === 'verified' || r.biometricStatus === 'verified'
    ).length;
    const pendingOcrToday = records.filter(
      (r) => r.ocrStatus === 'extracted' || r.biometricStatus === 'pending_verification'
    ).length;
    const pendingOcrTotal = pendingOcrToday;

    return {
      totalPatientsManaged,
      recordsToday,
      redAlertsToday,
      verifiedToday,
      pendingOcrToday,
      pendingOcrTotal,
    };
  },
};

export default dashboardService;
