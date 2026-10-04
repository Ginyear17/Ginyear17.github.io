"""博客 API"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Blog, BlogComment, User
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
    return blog


# ===== 评论 =====


@router.get("/blogs/{blog_id}/comments", response_model=BlogCommentList)
def list_blog_comments(
    blog_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """博客评论列表（旧 → 新）"""
    if db.get(Blog, blog_id) is None:
        raise HTTPException(status_code=404, detail="文章不存在或已被删除")
    total = db.scalar(
        select(func.count()).select_from(BlogComment).where(BlogComment.blog_id == blog_id)
    )
    items = db.scalars(
        select(BlogComment)
        .where(BlogComment.blog_id == blog_id)
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
    """发表评论（需登录，昵称自动使用用户名）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再评论")
    if db.get(Blog, blog_id) is None:
        raise HTTPException(status_code=404, detail="文章不存在或已被删除")
    comment = BlogComment(blog_id=blog_id, name=user.username, user_id=user.id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.post("/blogs/{blog_id}/comments/{comment_id}/like")
def like_blog_comment(blog_id: int, comment_id: int, db: Session = Depends(get_db)):
    """给评论点赞（+1，重复点赞由前端 localStorage 限制）"""
    comment = db.get(BlogComment, comment_id)
    if comment is None or comment.blog_id != blog_id:
        raise HTTPException(status_code=404, detail="评论不存在或已被删除")
    comment.likes += 1
    db.commit()
    return {"likes": comment.likes}


@router.delete("/blogs/{blog_id}/comments/{comment_id}/like")
def unlike_blog_comment(blog_id: int, comment_id: int, db: Session = Depends(get_db)):
    """取消评论点赞（-1，最低为 0）"""
    comment = db.get(BlogComment, comment_id)
    if comment is None or comment.blog_id != blog_id:
        raise HTTPException(status_code=404, detail="评论不存在或已被删除")
    comment.likes = max(0, comment.likes - 1)
    db.commit()
    return {"likes": comment.likes}
