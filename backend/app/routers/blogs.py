"""博客 API"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Blog, BlogComment, User
from .albums import SYSTEM_ALBUM_TITLES, auto_archive
from .auth import get_current_user
from ..schemas import (
    BlogCommentCreate,
    BlogCommentList,
    BlogCommentOut,
    BlogCreate,
    BlogDetailOut,
    BlogList,
    BlogOut,
)

router = APIRouter()


@router.get("/blogs", response_model=BlogList)
def list_blogs(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """博客列表（新 → 旧，分页；不含正文）"""
    total = db.scalar(select(func.count()).select_from(Blog))
    items = db.scalars(
        select(Blog).order_by(Blog.id.desc()).offset(offset).limit(limit)
    ).all()
    return BlogList(total=total, items=[BlogOut.model_validate(b) for b in items])


@router.get("/blogs/{blog_id}", response_model=BlogDetailOut)
def get_blog(blog_id: int, db: Session = Depends(get_db)):
    """博客详情（每次访问浏览量 +1），不存在返回 404"""
    blog = db.get(Blog, blog_id)
    if blog is None:
        raise HTTPException(status_code=404, detail="文章不存在或已被删除")
    blog.views += 1
    db.commit()
    db.refresh(blog)
    return blog


@router.post("/blogs", response_model=BlogDetailOut, status_code=201)
def create_blog(
    payload: BlogCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """发布博客（需站长登录）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再发布")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="仅站长可发布博客")
    # 摘要留空时自动截取正文开头（换行折成空格）作为简介
    summary = payload.summary.strip() or " ".join(payload.content.split())[:120]
    blog = Blog(
        title=payload.title.strip(),
        summary=summary,
        content=payload.content,
        cover=payload.cover,
        category=payload.category.strip() or "未分类",
        author_id=user.id,
    )
    db.add(blog)
    db.commit()
    db.refresh(blog)
    # 封面自动归档进该用户的「博客配图」系统相册
    if payload.cover:
        auto_archive(db, user.id, [payload.cover], "blog", blog.id, SYSTEM_ALBUM_TITLES["blog"])
    return blog


# ===== 评论 =====


@router.get("/blogs/{blog_id}/comments", response_model=BlogCommentList)
def list_blog_comments(
    blog_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """博客评论列表（旧 → 新，顶层评论带 replies）"""
    if db.get(Blog, blog_id) is None:
        raise HTTPException(status_code=404, detail="文章不存在或已被删除")
    total = db.scalar(
        select(func.count()).select_from(BlogComment).where(BlogComment.blog_id == blog_id)
    )
    # 只取顶层评论（parent_id 为 NULL），回复嵌在各自 replies 里
    items = db.scalars(
        select(BlogComment)
        .options(selectinload(BlogComment.replies))
        .where(BlogComment.blog_id == blog_id, BlogComment.parent_id.is_(None))
        .order_by(BlogComment.id.asc())
        .offset(offset)
        .limit(limit)
    ).all()
    return BlogCommentList(total=total, items=[BlogCommentOut.model_validate(c) for c in items])


@router.post("/blogs/{blog_id}/comments", response_model=BlogCommentOut, status_code=201)
def create_blog_comment(
    blog_id: int,
    payload: BlogCommentCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """发表评论（需登录，昵称自动使用用户名；可带 parent_id 回复某评论）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再评论")
    blog = db.get(Blog, blog_id)
    if blog is None:
        raise HTTPException(status_code=404, detail="文章不存在或已被删除")
    # 回复归一化：无论回复顶层评论还是回复某条回复，都挂到其顶层评论下（保持一层嵌套）
    parent_id = None
    if payload.parent_id is not None:
        parent = db.get(BlogComment, payload.parent_id)
        if parent is None or parent.blog_id != blog_id:
            raise HTTPException(status_code=404, detail="要回复的评论不存在或已被删除")
        parent_id = parent.parent_id or parent.id
    comment = BlogComment(
        blog_id=blog_id,
        parent_id=parent_id,
        name=user.username,
        user_id=user.id,
        content=payload.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
