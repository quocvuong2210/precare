import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class DeletionRequest(Base):
    __tablename__ = "deletion_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pregnancy_profile_id = Column(UUID(as_uuid=True), ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    checkup_id = Column(UUID(as_uuid=True), ForeignKey("checkups.id", ondelete="CASCADE"), nullable=True)
    target_type = Column(String(50), nullable=False)  # 'full_profile', 'single_checkup'
    reason = Column(Text, nullable=False)
    allow_anonymized_research = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="pending", nullable=False, index=True)  # 'pending', 'approved', 'rejected'
    
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    
    is_anonymized = Column(Boolean, default=False, nullable=False)
    is_purged_from_research = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    requester = relationship("User", foreign_keys=[requester_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    pregnancy_profile = relationship("PregnancyProfile", back_populates="deletion_requests")
    checkup = relationship("Checkup")

    __table_args__ = (
        CheckConstraint("target_type IN ('full_profile', 'single_checkup')", name="chk_deletion_target_type"),
        CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="chk_deletion_status"),
    )