# backend/app/schemas/ingest.py
import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class UploadedFileSummary(BaseModel):
    id: uuid.UUID
    file_name: Optional[str] = None
    document_type: str
    file_type: str
    file_size_bytes: Optional[int] = None
    status: str
    uploaded_by_name: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime


class UploadResponseData(BaseModel):
    file_id: uuid.UUID
    task_id: Optional[str] = None
    pregnancy_profile_id: uuid.UUID
    checkup_id: Optional[uuid.UUID] = None
    file_name: Optional[str] = None
    file_type: str
    file_size_bytes: Optional[int] = None
    document_type: str
    status: str
    tracking_url: str
    created_at: datetime


class UploadSingleResponse(BaseModel):
    success: bool = True
    data: UploadResponseData
    message: str


class BatchUploadItem(BaseModel):
    file_id: uuid.UUID
    task_id: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    status: str


class BatchUploadResponseData(BaseModel):
    batch_id: uuid.UUID
    total_files: int
    successful_enqueued: int
    failed_enqueued: int
    tracking_url: str
    items: List[BatchUploadItem]


class BatchUploadResponse(BaseModel):
    success: bool = True
    data: BatchUploadResponseData
    message: str


class TaskStatusResponseData(BaseModel):
    task_id: str
    file_id: Optional[uuid.UUID] = None
    state: str
    progress_percentage: int
    current_stage: str
    stage_message: str
    estimated_seconds_remaining: Optional[int] = None
    verification_url: Optional[str] = None
    error_code: Optional[str] = None
    can_retry: Optional[bool] = None


class TaskStatusResponse(BaseModel):
    success: bool = True
    data: TaskStatusResponseData


class BatchStatusItem(BaseModel):
    file_id: uuid.UUID
    file_name: Optional[str] = None
    state: str
    progress_percentage: int
    status: str
    verification_url: Optional[str] = None


class BatchStatusResponseData(BaseModel):
    batch_id: uuid.UUID
    total_files: int
    completed_files: int
    failed_files: int
    overall_progress_percentage: int
    is_all_finished: bool
    files: List[BatchStatusItem]


class BatchStatusResponse(BaseModel):
    success: bool = True
    data: BatchStatusResponseData


class UploaderInfo(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str


class FileDetailResponseData(BaseModel):
    id: uuid.UUID
    pregnancy_profile_id: uuid.UUID
    checkup_id: Optional[uuid.UUID] = None
    file_name: Optional[str] = None
    file_type: str
    file_size_bytes: Optional[int] = None
    document_type: str
    status: str
    presigned_view_url: str
    presigned_url_expires_in_seconds: int = 1800
    uploaded_by: Optional[UploaderInfo] = None
    ocr_raw_payload: Optional[Dict[str, Any]] = None
    created_at: datetime


class FileDetailResponse(BaseModel):
    success: bool = True
    data: FileDetailResponseData


class PaginationMetadata(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class FileListResponseData(BaseModel):
    items: List[UploadedFileSummary]
    pagination: PaginationMetadata


class FileListResponse(BaseModel):
    success: bool = True
    data: FileListResponseData


class CommonMessageResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


class WorklistQueueItem(BaseModel):
    id: uuid.UUID
    pregnancy_profile_id: uuid.UUID
    checkup_id: Optional[uuid.UUID] = None
    primary_doctor_id: Optional[uuid.UUID] = None
    primary_doctor_name: Optional[str] = None
    patient_name: str
    patient_phone: Optional[str] = None
    gestational_age_formatted: Optional[str] = None
    document_type: str
    file_name: Optional[str] = None
    file_type: str
    file_size_bytes: Optional[int] = None
    status: str
    ocr_confidence: Optional[float] = None
    uploaded_by_name: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime


class WorklistQueueResponseData(BaseModel):
    items: List[WorklistQueueItem]
    pagination: PaginationMetadata


class WorklistQueueResponse(BaseModel):
    success: bool = True
    data: WorklistQueueResponseData


class VerifyFileRequest(BaseModel):
    checkup_id: Optional[uuid.UUID] = None
    corrected_payload: Optional[Dict[str, Any]] = None
