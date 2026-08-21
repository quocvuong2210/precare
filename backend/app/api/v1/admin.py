import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_roles
from app.core.audit import log_audit_event
from app.models.models import MappingVerificationQueue, User

router = APIRouter(prefix="/admin", tags=["Admin & Mapping Queue"])

@router.get("/mapping-queue")
def list_pending_mappings(
    status: str = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    return db.query(MappingVerificationQueue).filter(MappingVerificationQueue.status == status).all()

@router.post("/mapping-queue/{queue_id}/verify")
def verify_mapping_item(
    queue_id: uuid.UUID,
    mapped_attribute: str,
    action: str = "approved",
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    item = db.query(MappingVerificationQueue).filter(MappingVerificationQueue.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục hàng đợi ánh xạ")

    item.mapped_attribute = mapped_attribute
    item.status = action
    item.verified_by = current_user.id
    item.verified_at = datetime.utcnow()
    db.commit()

    log_audit_event(db, current_user.id, "VERIFY_MAPPING", "mapping_verification_queue", item.id, request)
    return {"message": "Đã cập nhật trạng thái ánh xạ thành công", "item_id": item.id, "status": item.status}
