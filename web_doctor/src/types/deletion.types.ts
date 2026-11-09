// web_doctor/src/types/deletion.types.ts

export type DeletionTargetType = 'full_profile' | 'single_checkup';
export type DeletionStatus = 'pending' | 'approved' | 'rejected';

export interface DeletionRequestItem {
  id: string;
  requester_id: string;
  requester_name: string;
  pregnancy_profile_id: string;
  checkup_id?: string | null;
  target_type: DeletionTargetType;
  reason: string;
  allow_anonymized_research: boolean; // true: ẩn danh cho AI; false: xóa sạch hoàn toàn khỏi mô hình
  status: DeletionStatus;
  created_at: string;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
}

export interface CreateDeletionRequestPayload {
  pregnancy_profile_id: string;
  checkup_id?: string | null;
  target_type: DeletionTargetType;
  reason: string;
  allow_anonymized_research: boolean;
}

export interface ReviewDeletionPayload {
  status: 'approved' | 'rejected';
  review_notes?: string;
}

export interface ReviewDeletionResponseData {
  request_id: string;
  status: DeletionStatus;
  reviewed_by: {
    id: string;
    full_name: string;
    role: string;
  };
  is_anonymized: boolean;
  is_purged_from_research: boolean;
  reviewed_at: string;
}