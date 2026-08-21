import uuid
from typing import Optional
from fastapi import Request
from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_audit_event(
    db: Session,
    user_id: Optional[uuid.UUID],
    action: str,
    target_table: str,
    target_id: uuid.UUID,
    request: Optional[Request] = None
):
    ip_address = request.client.host if request and request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "system") if request else "system"

    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        target_table=target_table,
        target_id=target_id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_entry)
    db.commit()
