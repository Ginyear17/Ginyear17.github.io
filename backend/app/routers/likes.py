"""统一点赞 API（账号绑定：一个账号对一个目标只能赞一次）。

目标类型 target_type ∈ {moment, moment_comment, blog, blog_comment, message}
- likes 表记录"谁赞了谁"（唯一约束 user+type+target），是权威数据
- 展示计数 = COUNT(likes 表按目标)；moments/blogs 等的 likes 冗余列同步增减（保留迁移用）
- 点赞/取消均需登录；重复点赞幂等（不会 +2），取消为删除记录
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Blog, BlogComment, Like, Message, Moment, MomentComment, User
from .auth import get_current_user
from ..schemas import LikeStatusOut

router = APIRouter()

# 类型 -> (模型, 冗余计数列名)；message 无冗余列（数量直接来自 likes 表）
LIKE_MODELS: dict[str, tuple[type, str | None]] = {
    "moment": (Moment, "likes"),
    "moment_comment": (MomentComment, "likes"),
    "blog": (Blog, "likes"),
    "blog_comment": (BlogComment, "likes"),
    "message": (Message, None),
}


def like_count(db: Session, target_type: str, target_id: int) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(Like)
            .where(Like.target_type == target_type, Like.target_id == target_id)
        )
        or 0
    )


def _validate_type(target_type: str) -> tuple[type, str | None]:
    if target_type not in LIKE_MODELS:
        raise HTTPException(status_code=422, detail="不支持的点赞类型")
    return LIKE_MODELS[target_type]


def _sync_column(db: Session, model: type, obj_id: int, col: str | None, delta: int) -> None:
    """同步冗余计数列（保留给历史数据迁移用）；无冗余列的类型跳过"""
    if col is None:
        return
    obj = db.get(model, obj_id)
    if obj is not None:
        setattr(obj, col, max(0, getattr(obj, col, 0) + delta))


@router.post("/likes/{target_type}/{target_id}", response_model=LikeStatusOut)
def like_target(
    target_type: str,
    target_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """点赞（需登录；重复点赞幂等）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再点赞")
    model, col = _validate_type(target_type)
    if db.get(model, target_id) is None:
        raise HTTPException(status_code=404, detail="点赞目标不存在或已被删除")
    exists = db.scalar(
        select(Like.id).where(
            Like.user_id == user.id,
            Like.target_type == target_type,
            Like.target_id == target_id,
        )
    )
    if exists is None:
        db.add(Like(user_id=user.id, target_type=target_type, target_id=target_id))
        _sync_column(db, model, target_id, col, +1)
        db.commit()
    return LikeStatusOut(likes=like_count(db, target_type, target_id), liked=True)


@router.delete("/likes/{target_type}/{target_id}", response_model=LikeStatusOut)
def unlike_target(
    target_type: str,
    target_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """取消点赞（需登录；未赞过则保持原状）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再点赞")
    model, col = _validate_type(target_type)
    row = db.scalar(
        select(Like).where(
            Like.user_id == user.id,
            Like.target_type == target_type,
            Like.target_id == target_id,
        )
    )
    if row is not None:
        db.delete(row)
        _sync_column(db, model, target_id, col, -1)
        db.commit()
    return LikeStatusOut(likes=like_count(db, target_type, target_id), liked=False)


@router.get("/likes/status")
def like_status(
    type: str = Query(..., alias="type", description="目标类型，如 moment / blog_comment"),
    ids: str = Query(..., description="目标 id 列表，逗号分隔，如 1,2,3"),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """批量查询点赞状态：{目标id: {likes, liked}}；未登录时 liked 均为 false"""
    _validate_type(type)
    try:
        id_list = [int(i) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=422, detail="ids 必须是数字列表")
    if not id_list:
        return {}

    counts = dict(
        db.execute(
            select(Like.target_id, func.count())
            .where(Like.target_type == type, Like.target_id.in_(id_list))
            .group_by(Like.target_id)
        ).all()
    )
    liked_ids: set[int] = set()
    if user is not None:
        liked_ids = set(
            db.scalars(
                select(Like.target_id).where(
                    Like.target_type == type,
                    Like.target_id.in_(id_list),
                    Like.user_id == user.id,
                )
            ).all()
        )
    return {
        str(tid): {"likes": counts.get(tid, 0), "liked": tid in liked_ids} for tid in id_list
    }
