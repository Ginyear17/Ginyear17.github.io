"""Pydantic 模型：请求校验与响应序列化"""

from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    name: str = Field(default="匿名", max_length=50)
    content: str = Field(min_length=1, max_length=500)


class MessageOut(BaseModel):
    id: int
    name: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageList(BaseModel):
    total: int
    items: list[MessageOut]


class MomentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)
    images: list[str] = Field(default_factory=list, max_length=9)


class MomentOut(BaseModel):
    id: int
    content: str
    images: list[str]
    created_at: datetime
    # ORM 的同名 property，from_attributes 自动读取
    comment_count: int = 0
    # 列表页评论预览：按点赞数取前 3 条（MomentCommentOut 定义在下方，用前向引用）
    top_comments: list["MomentCommentOut"] = Field(default_factory=list)
    likes: int = 0

    model_config = {"from_attributes": True}


class MomentList(BaseModel):
    total: int
    items: list[MomentOut]


class MomentCommentCreate(BaseModel):
    name: str = Field(default="匿名", max_length=50)
    content: str = Field(min_length=1, max_length=500)


class MomentCommentOut(BaseModel):
    id: int
    moment_id: int
    name: str
    content: str
    likes: int = 0
    user_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MomentCommentList(BaseModel):
    total: int
    items: list[MomentCommentOut]


class UploadOut(BaseModel):
    url: str
