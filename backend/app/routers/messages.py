"""留言板 API"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Message, User
from .auth import get_current_user
from ..schemas import MessageCreate, MessageOut

router = APIRouter()


@router.get("/messages")
def list_messages(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """留言列表（新 → 旧，分页）"""
    total = db.scalar(select(func.count()).select_from(Message))
    items = db.scalars(
        select(Message).order_by(Message.id.desc()).offset(offset).limit(limit)
    ).all()
    return {
        "total": total,
        "items": [MessageOut.model_validate(m) for m in items],
    }


@router.post("/messages", response_model=MessageOut, status_code=201)
def create_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """发布留言（需登录；左上角显示用户名，署名选填显示在右下角）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再留言")
    message = Message(
        name=user.username,
        user_id=user.id,
        signature=payload.signature or None,
        content=payload.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
