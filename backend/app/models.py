"""ORM 模型定义"""

from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Message(Base):
    """留言板留言"""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), default="匿名")
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # TODO: 回复功能（parent_id 自关联）+ 站点访问量统计表
