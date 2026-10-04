"""ORM 模型定义"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Album(Base):
    """相册（用户自建 + 系统自动归档的"说说配图"/"博客配图"）"""

    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(String(200), default="")
    # 创建者
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    # 系统相册（自动归档产生，不允许删除）
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    user: Mapped["User"] = relationship(lazy="joined")  # 列表要显示用户名
    photos: Mapped[list["Photo"]] = relationship(
        back_populates="album", cascade="all, delete-orphan", order_by="Photo.id"
    )

    @property
    def username(self) -> str:
        return self.user.username

    @property
    def cover(self) -> str | None:
        """封面：相册内第一张照片，没有则为 None（前端显示占位图）"""
        return self.photos[0].url if self.photos else None

    @property
    def photo_count(self) -> int:
        return len(self.photos)


class Photo(Base):
    """相册照片"""

    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    album_id: Mapped[int] = mapped_column(ForeignKey("albums.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(255))
    # 来源：upload=相册页上传 / moment=说说配图 / blog=博客封面
    source: Mapped[str] = mapped_column(String(20), default="upload")
    # 关联的说说/博客 ID（upload 来源为 NULL）
    source_id: Mapped[int | None] = mapped_column(default=None)
    user_id: Mapped[int | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    album: Mapped["Album"] = relationship(back_populates="photos")


class Message(Base):
    """留言板留言"""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 用户名（登录后自动取用；历史匿名留言为“匿名”）
    name: Mapped[str] = mapped_column(String(50), default="匿名")
    # 留言者（接入用户系统后记录；历史匿名留言为 NULL）
    user_id: Mapped[int | None] = mapped_column(default=None)
    # 署名（选填，显示在留言右下角的“——署名”；留空不显示）
    signature: Mapped[str | None] = mapped_column(String(50), default=None)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    # 回复目标（自关联：NULL = 顶层留言；非 NULL = 对某条留言的回复）
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), default=None
    )
    # 顶层留言带回复列表（旧 → 新，级联删除：删留言同时删回复）
    parent: Mapped["Message | None"] = relationship(
        back_populates="replies", remote_side="Message.id"
    )
    replies: Mapped[list["Message"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan", order_by="Message.id"
    )

    # TODO: 回复功能（parent_id 自关联）——已完成


class Blog(Base):
    """博客文章（列表页显示简略信息，详情页显示正文）"""

    __tablename__ = "blogs"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    # 简介摘要：列表页与首页卡片展示，详情页不显示
    summary: Mapped[str] = mapped_column(String(300), default="")
    # 正文：纯文本段落（\n\n 分段），后续可换 Markdown 渲染
    content: Mapped[str] = mapped_column(Text)
    # 封面图 URL（选填，列表卡片左侧展示；为空用默认图）
    cover: Mapped[str | None] = mapped_column(String(255), default=None)
    category: Mapped[str] = mapped_column(String(30), default="未分类")
    # 浏览量（详情页每访问一次 +1）与点赞数
    views: Mapped[int] = mapped_column(default=0)
    likes: Mapped[int] = mapped_column(default=0)
    # 发布者（接入用户系统后记录；种子文章为 NULL）
    author_id: Mapped[int | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # TODO: 编辑 / 删除接口（仅限作者），评论功能


class Visit(Base):
    """站点访问记录：用于页脚的访问量（PV）与访客量（UV）统计"""

    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 浏览器端生成的持久唯一 ID（存 localStorage），UV 按它去重
    visitor_id: Mapped[str] = mapped_column(String(64), index=True)
    path: Mapped[str] = mapped_column(String(255), default="/")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class BlogComment(Base):
    """博客文章评论（对齐说说评论：昵称 / 点赞 / 时间）"""

    __tablename__ = "blog_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    blog_id: Mapped[int] = mapped_column(ForeignKey("blogs.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(50), default="匿名")
    # 评论者（需登录评论，自动取用户名）
    user_id: Mapped[int | None] = mapped_column(default=None)
    likes: Mapped[int] = mapped_column(default=0)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Moment(Base):
    """说说（个人动态时间线）"""

    __tablename__ = "moments"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(Text)
    # 配图 URL 列表，v1 存 JSON 数组（图片文件保存在后端 uploads/ 目录）
    images: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    # 发布者（接入用户系统后记录；历史数据为 NULL）
    author_id: Mapped[int | None] = mapped_column(default=None)
    # 点赞数
    likes: Mapped[int] = mapped_column(default=0)

    # 评论（级联删除：删说说同时删评论）
    comments: Mapped[list["MomentComment"]] = relationship(
        back_populates="moment", cascade="all, delete-orphan", order_by="MomentComment.id"
    )

    # TODO: 点赞数

    @property
    def comment_count(self) -> int:
        """评论数（Pydantic from_attributes 会自动带上）"""
        return len(self.comments)

    @property
    def top_comments(self) -> list["MomentComment"]:
        """点赞数最高的 3 条评论（列表页预览用），同赞数按时间新→旧"""
        return sorted(self.comments, key=lambda c: (-c.likes, -c.id))[:3]


class MomentComment(Base):
    """说说评论"""

    __tablename__ = "moment_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    moment_id: Mapped[int] = mapped_column(ForeignKey("moments.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(50), default="匿名")
    # 评论者（接入用户系统后记录；历史匿名评论为 NULL）
    user_id: Mapped[int | None] = mapped_column(default=None)
    # 点赞数
    likes: Mapped[int] = mapped_column(default=0)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    moment: Mapped["Moment"] = relationship(back_populates="comments")


class User(Base):
    """站点用户（邮箱验证码注册，可发说说）"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    # PBKDF2 哈希，格式：salt_hex$hash_hex
    password_hash: Mapped[str] = mapped_column(String(200))
    # 站长标记：首个注册的用户自动成为站长，可发布博客
    is_admin: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
