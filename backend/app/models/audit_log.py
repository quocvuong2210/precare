# backend/app/models/audit_log.py
from sqlalchemy import Column, BigInteger, String, DateTime, Text, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)
    target_table = Column(String(100), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    accessed_at = Column(DateTime(timezone=True), server_default=func.now())