"""Pydantic 模型：请求校验与响应序列化"""

from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    # 署名选填：显示在留言右下角的“——署名”
    signature: str | None = Field(default=None, max_length=50)
    content: str = Field(min_length=1, max_length=500)


class MessageReplyOut(BaseModel):
    """留言回复（扁平，不再嵌套）"""

    id: int
    name: str
    content: str
    created_at: datetime
    user_id: int | None = None

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: int
    name: str
    content: str
    created_at: datetime
    user_id: int | None = None
    signature: str | None = None
    # 顶层留言带的回复列表（旧 → 新）
    replies: list[MessageReplyOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class MessageReplyCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class MessageList(BaseModel):
    total: int
    items: list[MessageOut]


class VisitCreate(BaseModel):
    visitor_id: str = Field(min_length=8, max_length=64)
    path: str = Field(default="/", max_length=255)


class AlbumCreate(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    description: str = Field(default="", max_length=200)


class AlbumOut(BaseModel):
    id: int
    title: str
    description: str
    username: str
    user_id: int
    cover: str | None = None
    photo_count: int = 0
    is_system: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class AlbumList(BaseModel):
    total: int
    items: list[AlbumOut]


class PhotoOut(BaseModel):
    id: int
    album_id: int
    url: str
    source: str
    source_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PhotoList(BaseModel):
    total: int
    items: list[PhotoOut]


class PhotoAddIn(BaseModel):
    urls: list[str] = Field(min_length=1, max_length=20)


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


class BlogCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    summary: str = Field(default="", max_length=300)
    content: str = Field(min_length=1, max_length=50_000)
    cover: str | None = Field(default=None, max_length=255)
    category: str = Field(default="未分类", max_length=30)


class BlogOut(BaseModel):
    """列表 / 卡片用：不含正文"""

    id: int
    title: str
    summary: str
    cover: str | None = None
    category: str
    views: int = 0
    likes: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class BlogDetailOut(BlogOut):
    """详情用：含正文"""

    content: str


class BlogList(BaseModel):
    total: int
    items: list[BlogOut]


class BlogCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class BlogCommentOut(BaseModel):
    id: int
    blog_id: int
    name: str
    content: str
    likes: int = 0
    user_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BlogCommentList(BaseModel):
    total: int
    items: list[BlogCommentOut]
