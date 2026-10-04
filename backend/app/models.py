"""ORM 模型定义"""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


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

    # TODO: 回复功能（parent_id 自关联）


class Visit(Base):
    """站点访问记录：用于页脚的访问量（PV）与访客量（UV）统计"""

    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 浏览器端生成的持久唯一 ID（存 localStorage），UV 按它去重
    visitor_id: Mapped[str] = mapped_column(String(64), index=True)
    path: Mapped[str] = mapped_column(String(255), default="/")
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
