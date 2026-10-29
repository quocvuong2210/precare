from datetime import datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, model_validator


class CreateDeletionRequestPayload(BaseModel):
    pregnancy_profile_id: UUID = Field(..., description="ID hồ sơ thai kỳ muốn xóa")
    checkup_id: Optional[UUID] = Field(None, description="ID lần khám nếu chỉ xóa 1 lần khám cụ thể")
    target_type: Literal["full_profile", "single_checkup"] = Field(..., description="full_profile hoặc single_checkup")
    reason: str = Field(..., min_length=10, description="Lý do xóa hồ sơ (bắt buộc tối thiểu 10 ký tự)")
    allow_anonymized_research: bool = Field(
        True,
        description="True: cho phép ẩn danh hóa cho AI; False: xóa sạch hoàn toàn khỏi mô hình nghiên cứu"
    )

    @model_validator(mode="after")
    def validate_target(self):
        if self.target_type == "single_checkup" and not self.checkup_id:
            raise ValueError("Bắt buộc phải cung cấp checkup_id khi target_type là 'single_checkup'.")
        return self


class ReviewDeletionPayload(BaseModel):
    status: Literal["approved", "rejected"] = Field(..., description="'approved' để chấp thuận, 'rejected' để từ chối")
    review_notes: Optional[str] = Field(None, description="Ghi chú lâm sàng hoặc lý do từ chối")


# Response Schemas
class DeletionRequestCreatedData(BaseModel):
    request_id: UUID
    target_type: str
    allow_anonymized_research: bool
    status: str
    created_at: datetime


class DeletionRequestCreateResponse(BaseModel):
    success: bool = True
    data: DeletionRequestCreatedData
    message: str


class ReviewerSummary(BaseModel):
    id: UUID
    full_name: str
    role: str


class ReviewDeletionData(BaseModel):
    request_id: UUID
    status: str
    reviewed_by: ReviewerSummary
    is_anonymized: bool
    is_purged_from_research: bool
    reviewed_at: datetime


class ReviewDeletionResponse(BaseModel):
    success: bool = True
    data: ReviewDeletionData
    message: str


class DeletionRequestListItem(BaseModel):
    id: UUID
    requester_id: UUID
    requester_name: str
    pregnancy_profile_id: UUID
    checkup_id: Optional[UUID] = None
    target_type: str
    reason: str
    allow_anonymized_research: bool
    status: str
    created_at: datetime
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None