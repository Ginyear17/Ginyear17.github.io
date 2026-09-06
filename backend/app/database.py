"""数据库连接与 ORM 基类。

开发环境默认使用 SQLite（零配置，文件即数据库）。
上线时通过环境变量 DATABASE_URL 切换到服务器上已有的 PostgreSQL：

    DATABASE_URL=postgresql+psycopg://user:password@host:5432/ginyear

连接串由 SQLAlchemy URL 组成，ORM 层代码完全不用改。
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

# SQLite 需要允许跨线程访问（FastAPI 的线程池）
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """所有 ORM 模型的基类"""


def get_db():
    """FastAPI 依赖：每个请求一个会话，用完自动关闭"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
