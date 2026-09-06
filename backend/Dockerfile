# FastAPI 后端镜像：python-slim + uv 管理依赖
FROM python:3.11-slim

# 官方推荐的 uv 安装方式（从 uv 镜像复制静态二进制）
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# 先只复制依赖清单，利用 Docker 层缓存：
# 代码改动不会触发重新下载依赖
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY app ./app

EXPOSE 8000

# --no-sync：运行时不再联网检查依赖
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
