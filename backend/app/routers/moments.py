"""说说 API（含图片上传）"""

import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Moment, MomentComment, User
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
        .options(selectinload(Moment.comments))  # 预加载评论，避免 N+1 查询
        .order_by(Moment.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return MomentList(total=total, items=[MomentOut.model_validate(m) for m in items])


@router.get("/moments/{moment_id}", response_model=MomentOut)
def get_moment(moment_id: int, db: Session = Depends(get_db)):
    """单条说说详情（详情页用），不存在返回 404"""
    moment = db.get(Moment, moment_id)
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
    items = db.scalars(
        select(MomentComment)
        .where(MomentComment.moment_id == moment_id)
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
    """发表评论（需登录，昵称自动使用用户名）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再评论")
    if db.get(Moment, moment_id) is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    comment = MomentComment(
        moment_id=moment_id, name=user.username, user_id=user.id, content=payload.content
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
    """编辑说说（仅限作者本人；历史未记录作者的数据不限制）"""
    moment = db.get(Moment, moment_id)
    if moment is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    if user is None or (moment.author_id is not None and moment.author_id != user.id):
        raise HTTPException(status_code=403, detail="只能编辑自己发布的说说")
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
    """删除说说（仅限作者本人；评论随 ORM cascade 一并删除）"""
    moment = db.get(Moment, moment_id)
    if moment is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    if user is None or (moment.author_id is not None and moment.author_id != user.id):
        raise HTTPException(status_code=403, detail="只能删除自己发布的说说")
    db.delete(moment)
    db.commit()


@router.post("/moments/{moment_id}/like")
def like_moment(moment_id: int, db: Session = Depends(get_db)):
    """给说说点赞（+1，无用户系统，重复点赞由前端 localStorage 限制）"""
    moment = db.get(Moment, moment_id)
    if moment is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    moment.likes += 1
    db.commit()
    return {"likes": moment.likes}


@router.delete("/moments/{moment_id}/like")
def unlike_moment(moment_id: int, db: Session = Depends(get_db)):
    """取消说说点赞（-1，最低为 0）"""
    moment = db.get(Moment, moment_id)
    if moment is None:
        raise HTTPException(status_code=404, detail="说说不存在或已被删除")
    moment.likes = max(0, moment.likes - 1)
    db.commit()
    return {"likes": moment.likes}


@router.post("/moments/{moment_id}/comments/{comment_id}/like")
def like_comment(moment_id: int, comment_id: int, db: Session = Depends(get_db)):
    """给评论点赞（校验评论属于该说说）"""
    comment = db.get(MomentComment, comment_id)
    if comment is None or comment.moment_id != moment_id:
        raise HTTPException(status_code=404, detail="评论不存在或已被删除")
    comment.likes += 1
    db.commit()
    return {"likes": comment.likes}


@router.delete("/moments/{moment_id}/comments/{comment_id}/like")
def unlike_comment(moment_id: int, comment_id: int, db: Session = Depends(get_db)):
    """取消评论点赞（-1，最低为 0）"""
    comment = db.get(MomentComment, comment_id)
    if comment is None or comment.moment_id != moment_id:
        raise HTTPException(status_code=404, detail="评论不存在或已被删除")
    comment.likes = max(0, comment.likes - 1)
    db.commit()
    return {"likes": comment.likes}


@router.post("/moments", response_model=MomentOut, status_code=201)
def create_moment(
    payload: MomentCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """发布说说（需登录）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再发布")
    moment = Moment(content=payload.content, images=payload.images, author_id=user.id)
    db.add(moment)
    db.commit()
    db.refresh(moment)
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
