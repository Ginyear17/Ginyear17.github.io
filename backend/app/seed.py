"""首次启动种子数据：博客表为空时写入示例文章，方便列表页 / 详情页直接有内容可看。

正式数据通过 POST /api/blogs 或直接改数据库添加；此处内容仅作占位演示。
"""

from sqlalchemy import func, select

from .database import SessionLocal
from .models import Blog, User


def ensure_admin_exists() -> None:
    """确保存在站长账号：若还没有任何站长，把最早注册的用户提升为站长。

    规则：首个注册的用户即站长（个人站点，站长就是博主本人）。
    幂等：已有站长时什么都不做。
    """
    with SessionLocal() as db:
        has_admin = db.scalar(
            select(func.count()).select_from(User).where(User.is_admin.is_(True))
        )
        if has_admin:
            return
        first = db.scalar(select(User).order_by(User.id.asc()))
        if first is None:
            return  # 还没有任何用户，站长由首次注册产生
        first.is_admin = True
        db.commit()
        print(f"已将最早注册的用户「{first.username}」提升为站长")


def seed_blogs() -> None:
    """首次启动种子数据：博客表为空时写入示例文章，方便列表页 / 详情页直接有内容可看。

    正式数据通过发布页（需站长登录）添加；此处内容仅作占位演示。
    """
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Blog)):
            return
        db.add(
            Blog(
                title="阿里云域名绑定动态IP",
                summary=(
                    "怎么通过公网访问家中的设备呢？首先需要一个公网 IP，可以向客服申请。"
                    "那之后你就可以查询到你现在的 IP 了。然后你在外面就可以使用 IP 访问家里的设备。"
                    "但是宽带的 IP 基本是动态的，也就是一段时间之后 IP 地址会变化。"
                    "所以需要使用一个域名绑定你的 IP，并且使用一个脚本去周期性地检查现在的 IP 有没有变化，并更新 IP。"
                ),
                content=(
                    "## 为什么要 DDNS\n\n"
                    "怎么通过公网访问家中的设备呢？首先需要一个**公网 IP**，可以向宽带客服申请"
                    "（说明有远程访问家中 NAS、监控等需求即可）。拿到公网 IP 后，在外面就可以直接"
                    "通过这个 IP 访问家里的设备了。\n\n"
                    "问题在于，家宽的公网 IP 基本是*动态的*，运营商会周期性更换，之前记下的 IP 很快就失效了。"
                    "解决办法是使用一个域名绑定你的 IP，再用脚本周期性检查 IP 是否变化并自动更新 DNS 解析记录，"
                    "这就是通常所说的 **DDNS**（动态域名解析）。\n\n"
                    "## 以阿里云为例的实现步骤\n\n"
                    "1. 在阿里云域名解析控制台为你的域名添加一条 `A` 记录，指向当前的家庭公网 IP；\n"
                    "2. 在 RAM 访问控制台创建一个 AccessKey，并授予 `AliyunDNSFullAccess` 权限（仅用于更新解析记录）；\n"
                    "3. 写一个脚本：查询本机当前公网 IP，与解析记录中的值对比，不一致则调用阿里云 DNS API 更新记录；\n"
                    "4. 在路由器或家中常开的设备上用 cron / 定时任务周期执行该脚本（如每 5 分钟一次）。\n\n"
                    "核心更新逻辑大致如下：\n\n"
                    "```python\n"
                    "import requests\n\n"
                    "def get_public_ip() -> str:\n"
                    "    return requests.get('https://api.ipify.org', timeout=5).text\n\n"
                    "def update_record(domain: str, rr: str, ip: str) -> None:\n"
                    "    \"\"\"调用阿里云 DNS API，把解析记录更新为最新 IP\"\"\"\n"
                    "    # AddDomainRecord / UpdateDomainRecord，详见阿里云 CLI/SDK 文档\n"
                    "    ...\n"
                    "```\n\n"
                    "> 注意：家宽 80 / 443 端口通常被封禁，对外服务需要改用其他端口。\n"
                    "> 若宽带分配的是 IPv6，则需要在支持 IPv6 的网络环境下访问。\n\n"
                    "这样无论运营商怎么换 IP，域名始终指向家里的最新地址，在外访问只需要记住域名即可。"
                ),
                cover="/assets/images/album/光影.jpg",
                category="开发",
            )
        )
        db.commit()
