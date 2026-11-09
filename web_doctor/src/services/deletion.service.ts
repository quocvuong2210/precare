// web_doctor/src/services/deletion.service.ts
import { apiClient } from './auth.service';
import {
  DeletionRequestItem,
  CreateDeletionRequestPayload,
  ReviewDeletionPayload,
  ReviewDeletionResponseData,
} from '../types/deletion.types';

export const deletionApi = {
  /**
   * 1. Gửi yêu cầu xóa hồ sơ y tế (Dành cho Thai phụ / Bác sĩ hỗ trợ)
   * POST /api/v1/deletion-requests
   */
  submitRequest: async (payload: CreateDeletionRequestPayload) => {
    const response = await apiClient.post('/deletion-requests', payload);
    return response.data;
  },

  /**
   * 2. Lấy danh sách yêu cầu xóa hồ sơ (Dành cho Bác sĩ phụ trách chính & Admin)
   * GET /api/v1/deletion-requests?status=pending
   */
  getRequests: async (statusFilter?: string): Promise<DeletionRequestItem[]> => {
    const response = await apiClient.get<DeletionRequestItem[]>('/deletion-requests', {
      params: statusFilter ? { status: statusFilter } : undefined,
    });
    return response.data;
  },

  /**
   * 3. Xét duyệt (Duyệt/Từ chối) yêu cầu xóa hồ sơ
   * PATCH /api/v1/deletion-requests/{request_id}/review
   */
  reviewRequest: async (
    requestId: string,
    payload: ReviewDeletionPayload
  ): Promise<{ success: boolean; data: ReviewDeletionResponseData; message: string }> => {
    const response = await apiClient.patch(`/deletion-requests/${requestId}/review`, payload);
    return response.data;
  },
};