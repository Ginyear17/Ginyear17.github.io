"""说说 API（含图片上传）"""

import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Moment, MomentComment, User
from .albums import SYSTEM_ALBUM_TITLES, auto_archive
from .auth import get_current_user
from ..schemas import (
    MomentCommentCreate,
    MomentCommentList,
    MomentCommentOut,
    MomentCreate,
    MomentList,
    MomentOut,
    UploadOut,
)

router = APIRouter()

# 上传文件保存目录（本地磁盘，SQLite 与生产共用；如需上云后续换对象存储）
UPLOAD_DIR = Path("uploads")
ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


@router.get("/moments", response_model=MomentList)
def list_moments(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """说说列表（新 → 旧，分页）"""
    total = db.scalar(select(func.count()).select_from(Moment))
    items = db.scalars(
        select(Moment)
        .options(selectinload(Moment.comments).selectinload(MomentComment.replies))  # 预加载评论及回复，避免 N+1
        .order_by(Moment.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return MomentList(total=total, items=[MomentOut.model_validate(m) for m in items])


@router.get("/moments/{moment_id}", response_model=MomentOut)
def get_moment(moment_id: int, db: Session = Depends(get_db)):
    """单条说说详情（详情页用），不存在返回 404"""
    moment = db.scalar(
        select(Moment)
        .options(selectinload(Moment.comments).selectinload(MomentComment.replies))
        .where(Moment.id == moment_id)
    )
    if moment is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    return moment


@router.get("/moments/{moment_id}/comments", response_model=MomentCommentList)
def list_comments(
    moment_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """某条说说的评论列表（旧 → 新，评论量少，默认一页 50）"""
    if db.get(Moment, moment_id) is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    total = db.scalar(
        select(func.count()).select_from(MomentComment).where(MomentComment.moment_id == moment_id)
    )
    # 只取顶层评论（parent_id 为 NULL），回复嵌在各自 replies 里
    items = db.scalars(
        select(MomentComment)
        .options(selectinload(MomentComment.replies))
        .where(MomentComment.moment_id == moment_id, MomentComment.parent_id.is_(None))
        .order_by(MomentComment.id.asc())
        .offset(offset)
        .limit(limit)
    ).all()
    return MomentCommentList(total=total, items=[MomentCommentOut.model_validate(c) for c in items])


@router.post("/moments/{moment_id}/comments", response_model=MomentCommentOut, status_code=201)
def create_comment(
    moment_id: int,
    payload: MomentCommentCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """发表评论（需登录，昵称自动使用用户名；可带 parent_id 回复某评论）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再评论")
    moment = db.get(Moment, moment_id)
    if moment is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    # 回复归一化：无论回复顶层评论还是回复某条回复，都挂到其顶层评论下（保持一层嵌套）
    parent_id = None
    if payload.parent_id is not None:
        parent = db.get(MomentComment, payload.parent_id)
        if parent is None or parent.moment_id != moment_id:
            raise HTTPException(status_code=404, detail="要回复的评论不存在或已被删除")
        parent_id = parent.parent_id or parent.id
    comment = MomentComment(
        moment_id=moment_id,
        parent_id=parent_id,
        name=user.username,
        user_id=user.id,
        content=payload.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.put("/moments/{moment_id}", response_model=MomentOut)
def update_moment(
    moment_id: int,
    payload: MomentCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """编辑说说（仅站长）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="仅站长可编辑说说")
    moment = db.get(Moment, moment_id)
    if moment is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    moment.content = payload.content
    moment.images = payload.images
    db.commit()
    db.refresh(moment)
    return moment


@router.delete("/moments/{moment_id}", status_code=204)
def delete_moment(
    moment_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """删除说说（仅站长；评论随 ORM cascade 一并删除）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="仅站长可删除说说")
    moment = db.get(Moment, moment_id)
    if moment is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    db.delete(moment)
    db.commit()


@router.post("/moments", response_model=MomentOut, status_code=201)
def create_moment(
    payload: MomentCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """发布说说（仅站长）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再发布")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="仅站长可发布说说")
    moment = Moment(content=payload.content, images=payload.images, author_id=user.id)
    db.add(moment)
    db.commit()
    db.refresh(moment)
    # 配图自动归档进该用户的「说说配图」系统相册
    auto_archive(db, user.id, payload.images, "moment", moment.id, SYSTEM_ALBUM_TITLES["moment"])
    return moment


@router.post("/upload", response_model=UploadOut)
async def upload_image(file: UploadFile = File(...)):
    """上传配图，返回可访问的 URL（一次一张，前端多图循环调用）"""
    ext = ALLOWED_TYPES.get(file.content_type)
    if ext is None:
        raise HTTPException(status_code=415, detail="仅支持 jpg/png/gif/webp 图片")
    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="图片不能超过 5MB")

    UPLOAD_DIR.mkdir(exist_ok=True)
    # 随机文件名：避免覆盖，也不暴露原始文件名
    name = f"{secrets.token_hex(8)}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    return UploadOut(url=f"/uploads/{name}")
