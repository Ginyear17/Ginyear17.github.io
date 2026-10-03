"""用户认证 API：邮箱验证码注册 / 登录 / 登出 / 当前用户。

会话采用 HMAC 签名 Cookie（HttpOnly，无需服务端存储，stdlib 实现）：
    SECRET_KEY 用于签名，务必在生产环境通过环境变量设置随机值。

SMTP 邮件使用标准库 smtplib 发送（无额外依赖），配置项全部来自环境变量：
    SMTP_HOST       SMTP 服务器，如 smtp.qq.com（未配置则验证码接口返回 503）
    SMTP_PORT       端口，默认 465
    SMTP_SSL        是否 SSL，默认 true
    SMTP_USER       登录账号（QQ 邮箱用授权码作为 SMTP_PASSWORD）
    SMTP_PASSWORD   登录密码 / 授权码
    SMTP_FROM       发件人地址，默认同 SMTP_USER

本地开发可设 SMTP_DEV_MODE=true：不发真实邮件，验证码直接随响应返回（仅限开发）。
"""

import hashlib
import hmac
import os
import re
import secrets
import smtplib
import time
from email.header import Header
from email.mime.text import MIMEText
from email.utils import formataddr

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User

router = APIRouter()

# ===== 密码哈希（PBKDF2-SHA256，标准库实现） =====
PBKDF2_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, hash_hex = stored.split("$", 1)
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), PBKDF2_ITERATIONS)
    return hmac.compare_digest(dk.hex(), hash_hex)


# ===== 签名 Cookie 会话 =====
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
SESSION_COOKIE = "session"
SESSION_TTL = 30 * 24 * 3600  # 30 天


def _sign(data: str) -> str:
    return hmac.new(SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()


def _session_cookie_value(user_id: int) -> str:
    payload = f"{user_id}.{int(time.time()) + SESSION_TTL}"
    return f"{payload}.{_sign(payload)}"


def _user_id_from_cookie(value: str | None) -> int | None:
    if not value:
        return None
    try:
        payload, sig = value.rsplit(".", 1)
        if not hmac.compare_digest(_sign(payload), sig):
            return None
        uid, exp = payload.split(".")
        if int(exp) < time.time():
            return None
        return int(uid)
    except (ValueError, TypeError):
        return None


def set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        SESSION_COOKIE, _session_cookie_value(user_id),
        max_age=SESSION_TTL, httponly=True, samesite="lax",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """FastAPI 依赖：从会话 Cookie 解析当前用户，未登录返回 None"""
    uid = _user_id_from_cookie(request.cookies.get(SESSION_COOKIE))
    return db.get(User, uid) if uid is not None else None


def require_user(user: User | None) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录")
    return user


# ===== 邮箱验证码 =====
EMAIL_RE = re.compile(r"^[\w.+-]+@[\w-]+(\.[\w-]+)+$")
CODE_TTL = 600                    # 验证码有效期 10 分钟
CODE_RESEND_INTERVAL = 60         # 同邮箱重发间隔 60 秒
CODE_MAX_ATTEMPTS = 5             # 单个验证码最多校验 5 次
CODE_DAILY_LIMIT = 10             # 同邮箱每日最多发 10 封
_code_store: dict[str, dict] = {}  # email -> {"hash": …, "exp": 时间戳, "attempts": n}
_send_log: dict[str, dict] = {}    # email -> {"last": 时间戳, "day": "YYYYMMDD", "count": n}


def _smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"))


def _send_email(to: str, code: str) -> None:
    host = os.environ["SMTP_HOST"]
    port = int(os.getenv("SMTP_PORT", "465"))
    use_ssl = os.getenv("SMTP_SSL", "true").lower() != "false"
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]
    sender = os.getenv("SMTP_FROM", user)

    msg = MIMEText(
        f"你的注册验证码是：{code}\n{CODE_TTL // 60} 分钟内有效，请勿泄露给他人。\n\n—— 小杰的杂物间",
        "plain", "utf-8",
    )
    msg["Subject"] = Header("注册验证码 - 小杰的杂物间", "utf-8")
    msg["From"] = formataddr((str(Header("小杰的杂物间", "utf-8")), sender))
    msg["To"] = to

    if use_ssl:
        with smtplib.SMTP_SSL(host, port, timeout=15) as smtp:
            smtp.login(user, password)
            smtp.sendmail(sender, [to], msg.as_string())
    else:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(sender, [to], msg.as_string())


# ===== 请求/响应模型 =====
class SendCodeIn(BaseModel):
    email: str


class RegisterIn(BaseModel):
    username: str = Field(min_length=2, max_length=20)
    email: str
    code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=6, max_length=64)


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


USERNAME_RE = re.compile(r"^[\w\u4e00-\u9fa5]{2,20}$")


# ===== 路由 =====
@router.post("/send-code", status_code=204)
def send_code(payload: SendCodeIn):
    """发送注册验证码（60 秒重发间隔，每日每邮箱上限 10 封）"""
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="邮箱格式不正确")

    now = time.time()
    log = _send_log.get(email)
    if log and now - log["last"] < CODE_RESEND_INTERVAL:
        raise HTTPException(status_code=429, detail=f"发送太频繁，请 {CODE_RESEND_INTERVAL} 秒后再试")
    today = time.strftime("%Y%m%d")
    if log and log["day"] == today and log["count"] >= CODE_DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="该邮箱今日发送次数已达上限")

    code = f"{secrets.randbelow(1_000_000):06d}"

    def _remember() -> None:
        _code_store[email] = {"hash": hash_password(code), "exp": now + CODE_TTL, "attempts": 0}
        _send_log[email] = {
            "last": now,
            "day": today,
            "count": log["count"] + 1 if log and log["day"] == today else 1,
        }

    if os.getenv("SMTP_DEV_MODE", "").lower() == "true":
        # 开发模式：不发真实邮件，验证码直接返回（生产环境务必关闭！）
        _remember()
        import json

        return Response(
            content=json.dumps({"dev_code": code}),
            media_type="application/json",
            headers={"X-Dev-Note": "SMTP_DEV_MODE=true, never enable in production"},
        )
    if not _smtp_configured():
        raise HTTPException(status_code=503, detail="邮件服务未配置（缺少 SMTP 环境变量）")
    _send_email(email, code)
    _remember()


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: RegisterIn, response: Response, db: Session = Depends(get_db)):
    """邮箱验证码注册，成功后自动登录"""
    username = payload.username.strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=422, detail="用户名需为 2~20 位中英文、数字或下划线")
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="邮箱格式不正确")

    # 校验验证码
    entry = _code_store.get(email)
    if not entry or entry["exp"] < time.time():
        raise HTTPException(status_code=400, detail="验证码已过期，请重新发送")
    if entry["attempts"] >= CODE_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="验证码错误次数过多，请重新发送")
    if not verify_password(payload.code, entry["hash"]):
        entry["attempts"] += 1
        raise HTTPException(status_code=400, detail="验证码错误")

    # 用户名 / 邮箱占用检查
    if db.scalar(select(User).where(User.username == username)):
        raise HTTPException(status_code=409, detail="用户名已被占用")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="该邮箱已注册")

    user = User(username=username, email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    _code_store.pop(email, None)  # 验证码一次性
    set_session_cookie(response, user.id)  # 注册即登录
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    """账号密码登录，成功后种下会话 Cookie"""
    user = db.scalar(select(User).where(User.username == payload.username.strip()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码错误")
    set_session_cookie(response, user.id)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response):
    clear_session_cookie(response)


@router.get("/me", response_model=UserOut | None)
def me(user: User | None = Depends(get_current_user)):
    """当前登录用户，未登录返回 null"""
    return user
