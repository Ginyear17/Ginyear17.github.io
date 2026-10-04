"""相册 API：自建相册 + 说说/博客图片自动归档"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Album, Photo, User
from .auth import get_current_user
from ..schemas import (
    AlbumCreate,
    AlbumList,
    AlbumOut,
    PhotoAddIn,
    PhotoList,
    PhotoOut,
)

router = APIRouter()

# 系统相册标题（自动归档的目标相册，按用户隔离）
SYSTEM_ALBUM_TITLES = {
    "moment": "说说配图",
    "blog": "博客配图",
}


def auto_archive(
    db: Session,
    user_id: int,
    urls: list[str],
    source: str,
    source_id: int | None,
    album_title: str,
) -> None:
    """把图片 URL 自动归档进用户的系统相册（同相册内按 URL 去重）。

    供说说/博客发布流程调用；系统相册不存在时自动创建。
    """
    urls = [u for u in urls if u]
    if not urls:
        return
    album = db.scalar(
        select(Album).where(
            Album.user_id == user_id,
            Album.title == album_title,
            Album.is_system.is_(True),
        )
    )
    if album is None:
        album = Album(title=album_title, user_id=user_id, is_system=True)
        db.add(album)
        db.flush()  # 拿到 album.id
    existing = set(
        db.scalars(select(Photo.url).where(Photo.album_id == album.id)).all()
    )
    for url in urls:
        if url not in existing:
            db.add(Photo(album_id=album.id, url=url, source=source, source_id=source_id, user_id=user_id))
            existing.add(url)
    db.commit()  # 由说说/博客发布流程调用时已过主记录提交点，这里提交归档结果


def _get_album_or_404(db: Session, album_id: int) -> Album:
    album = db.get(Album, album_id)
    if album is None:
        raise HTTPException(status_code=404, detail="相册不存在或已被删除")
    return album


def _require_owner(album: Album, user: User | None) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录")
    if album.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能操作自己的相册")
    return user


@router.get("/albums", response_model=AlbumList)
def list_albums(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """相册列表（新 → 旧，分页）"""
    total = db.scalar(select(func.count()).select_from(Album))
    items = db.scalars(
        select(Album)
        .options(selectinload(Album.photos))  # 封面/数量需要照片，避免 N+1
        .order_by(Album.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return AlbumList(total=total, items=[AlbumOut.model_validate(a) for a in items])


@router.post("/albums", response_model=AlbumOut, status_code=201)
def create_album(
    payload: AlbumCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """创建相册（需登录）"""
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录后再创建相册")
    album = Album(
        title=payload.title.strip(),
        description=payload.description.strip(),
        user_id=user.id,
    )
    db.add(album)
    db.commit()
    db.refresh(album)
    return album


@router.delete("/albums/{album_id}", status_code=204)
def delete_album(
    album_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """删除相册（仅限创建者；系统相册不可删，照片记录随级联删除）"""
    album = _get_album_or_404(db, album_id)
    _require_owner(album, user)
    if album.is_system:
        raise HTTPException(status_code=403, detail="系统相册（说说配图/博客配图）不能删除")
    db.delete(album)
    db.commit()


@router.get("/albums/{album_id}/photos", response_model=PhotoList)
def list_photos(
    album_id: int,
    db: Session = Depends(get_db),
):
    """相册内的照片列表（旧 → 新）"""
    album = _get_album_or_404(db, album_id)
    items = db.scalars(
        select(Photo).where(Photo.album_id == album.id).order_by(Photo.id.asc())
    ).all()
    return PhotoList(total=len(items), items=[PhotoOut.model_validate(p) for p in items])


@router.post("/albums/{album_id}/photos", response_model=PhotoList, status_code=201)
def add_photos(
    album_id: int,
    payload: PhotoAddIn,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """往相册添加照片（仅限创建者，同相册内 URL 去重）"""
    album = _get_album_or_404(db, album_id)
    _require_owner(album, user)
    existing = set(db.scalars(select(Photo.url).where(Photo.album_id == album.id)).all())
    added = []
    for url in payload.urls:
        url = url.strip()
        if url and url not in existing:
            photo = Photo(album_id=album.id, url=url, source="upload", user_id=user.id)
            db.add(photo)
            existing.add(url)
            added.append(photo)
    db.commit()
    for p in added:
        db.refresh(p)
    return PhotoList(total=len(added), items=[PhotoOut.model_validate(p) for p in added])
