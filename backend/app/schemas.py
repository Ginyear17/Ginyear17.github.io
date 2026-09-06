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
