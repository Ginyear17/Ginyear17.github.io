"""留言板 API"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Message, User
from .auth import get_current_user
from ..schemas import MessageCreate, MessageOut, MessageReplyCreate, MessageReplyOut

router = APIRouter()


@router.get("/messages")
def list_messages(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """留言列表（新 → 旧，分页，带回复；只取顶层留言，回复嵌在 replies 里）"""
    top_level = Message.parent_id.is_(None)
    total = db.scalar(select(func.count()).select_from(Message).where(top_level))
    items = db.scalars(
        select(Message)
        .options(selectinload(Message.replies))  # 预加载回复，避免 N+1
        .where(top_level)
        .order_by(Message.id.desc())
        .offset(offset)
        .limit(limit)
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


@router.post("/messages/{message_id}/replies", response_model=MessageReplyOut, status_code=201)
def reply_message(
    message_id: int,
    payload: MessageReplyCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """回复留言（需登录；回复顶层留言，若目标是回复则自动挂到其顶层留言下）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再回复")
    target = db.get(Message, message_id)
    if target is None:
        raise HTTPException(status_code=404, detail="留言不存在或已被删除")
    parent_id = target.parent_id or target.id  # 回复回复时，挂到顶层留言
    reply = Message(parent_id=parent_id, name=user.username, user_id=user.id, content=payload.content)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply
