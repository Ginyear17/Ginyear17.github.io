"""FastAPI 应用入口。

本地启动：
    cd backend
    .venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

交互式 API 文档：http://localhost:8000/docs
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .database import Base, engine
from .routers import albums, auth, blogs, messages, moments, stats
from .seed import ensure_admin_exists, seed_blogs

# SQLite 模式下确保数据目录存在（DATABASE_URL 为 postgresql 时无副作用）
os.makedirs("data", exist_ok=True)
# 图片上传目录（说说配图，由 /uploads/* 静态托管）
os.makedirs("uploads", exist_ok=True)

# 建表（开发阶段用 create_all；表结构变复杂后引入 Alembic 做迁移）
Base.metadata.create_all(bind=engine)


def _ensure_column(table: str, column: str, ddl_type: str) -> None:
    """轻量补列：create_all 不会修改已存在的表，新增列时在此补上"""
    if column not in {c["name"] for c in inspect(engine).get_columns(table)}:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))


# 点赞数 / 说说作者（v1.2 新增，SQLite/PostgreSQL 语法一致）
_ensure_column("moments", "likes", "INTEGER NOT NULL DEFAULT 0")
_ensure_column("moment_comments", "likes", "INTEGER NOT NULL DEFAULT 0")
_ensure_column("moments", "author_id", "INTEGER")
_ensure_column("moment_comments", "user_id", "INTEGER")
_ensure_column("messages", "user_id", "INTEGER")
_ensure_column("messages", "signature", "VARCHAR(50)")
# 博客发布者（v1.3 新增）
_ensure_column("blogs", "author_id", "INTEGER")
# 留言回复（v1.3 新增；旧库补列不带 FK 约束，仅作关联查询用）
_ensure_column("messages", "parent_id", "INTEGER")
# 站长标记（v1.3 新增）
_ensure_column("users", "is_admin", "INTEGER NOT NULL DEFAULT 0")

# 补列完成后再执行：首次启动写入示例博客（表为空时才生效）；并确保存在站长账号
seed_blogs()
ensure_admin_exists()

app = FastAPI(title="小杰的杂物间 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # 上线后收紧为实际站点域名，如 https://ginyear17.github.io
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(messages.router, prefix="/api")
app.include_router(blogs.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(moments.router, prefix="/api")
app.include_router(albums.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth")

# 上传的图片静态托管（nginx 部署时需同样反代 /uploads/）
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}
