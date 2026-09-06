"""FastAPI 应用入口。

本地启动：
    cd backend
    .venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

交互式 API 文档：http://localhost:8000/docs
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import messages

# SQLite 模式下确保数据目录存在（DATABASE_URL 为 postgresql 时无副作用）
os.makedirs("data", exist_ok=True)

# 建表（开发阶段用 create_all；表结构变复杂后引入 Alembic 做迁移）
Base.metadata.create_all(bind=engine)

app = FastAPI(title="小杰的杂物间 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # 上线后收紧为实际站点域名，如 https://ginyear17.github.io
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(messages.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
