# 小杰的杂物间（Ginyear17.github.io）

> 个人博客站点 · 纯原生 HTML / CSS / JavaScript · 课程设计（Coursework Design）
> 线上地址：<https://ginyear17.github.io/>

---

## 项目简介

一个不依赖任何框架、无构建工具、无后端的纯静态个人网站。所有页面共享统一的
Header / Sidebar / Footer 布局，通过复制粘贴模板的方式实现"多页"（MPA）结构。

| 项 | 说明 |
|---|---|
| 构建工具 | Vite 6（多页应用 MPA 模式，`npm run dev` / `build` / `preview`） |
| 前端 | 原生 HTML5 + CSS3 + JavaScript（ES Module），无框架 |
| 后端 | FastAPI + SQLAlchemy（uv 管理依赖，代码在 `backend/`），开发库 SQLite、上线 PostgreSQL |
| 已接入后端的页面 | 留言板（`GET/POST /api/messages`）；其余仍为前端占位 |
| 外部依赖 | 仅 Font Awesome 6.4.0（cdnjs CDN，全站图标） |
| 本地 vendor 库 | [lunar-javascript 1.7.3](https://github.com/6tail/lunar-javascript)（农历计算） |
| 存储 | `localStorage`（主题）、`sessionStorage`（音乐播放状态） |
| 部署 | 自建 Linux 服务器 + Docker Compose（规划中），数据库用服务器上已有的 PostgreSQL |

---

## 目录结构

```text
Ginyear17.github.io/
├── index.html                  # 首页（唯一完整开发的页面）
├── package.json / vite.config.js
├── .github/workflows/deploy.yml # GitHub Pages 自动部署
├── sitemap.xml                 # 站点地图（7 个 URL，lastmod 2025-04-02）
├── src/                        # 源码（Vite 处理，构建时打包哈希）
│   └── js/
│       ├── main.js             #   公共入口：注入布局 + 初始化各模块
│       ├── ui.js               #   主题切换 / 移动菜单 / 返回顶部（原 scripts.js）
│       ├── modal.js            #   登录模态框
│       ├── calendar.js         #   实时时钟 + 农历日期（依赖 lunar 库）
│       ├── music-card.js       #   音乐播放器卡片（全站，跨页续播）
│       ├── author-bio.js       #   作者卡片随机个性签名
│       ├── slider.js           #   首页轮播图
│       ├── click-appears.js    #   点击生成飘落爱心
│       ├── components/
│       │   └── layout.js       #   ★ 公共布局：header/移动菜单/登录框/侧栏/页脚模板
│       └── pages/
│           ├── home.js         #   首页入口（布局 + 轮播 + 爱心）
│           ├── about.js        #   关于页入口
│           └── site.js         #   其余占位页通用入口
├── assets/
│   ├── css/                    # 按模块拆分的样式（10 个文件，被各 HTML <link> 引入）
│   │   ├── base.css            #   全局基础样式 / CSS 变量 / 深色主题 / @font-face 字体 / 背景图
│   │   ├── header.css / footer.css / sidebar.css / main-card.css / modal.css
│   │   ├── slider.css / blog-posts.css / click-appears.css   # 仅首页
│   │   └── about_main_card.css # 仅关于页
│   ├── fonts/                  # 3 个 TTF 字体（base.css @font-face 引用）
│   ├── images/
│   │   ├── logo.png / logo.webp / logo2.webp
│   │   ├── album/              #   7 张照片（轮播图 + 博客缩略图使用）
│   │   ├── avatars/            #   avatar-main.webp（作者头像）
│   │   └── backgrounds/        #   2 张背景图（base.css 引用）
│   └── music/                  # 10 首 mp3 + cover/ 10 张封面（构建时原样复制进 dist）
├── pages/
│   ├── about/index.html        # 关于页（唯一有完整内容的子页面）
│   ├── album/index.html        # 相册（占位，未开发）
│   ├── blog/aliyun_ddns.html   # 博客文章页模板（占位，正文未写）
│   ├── board/index.html        # 留言板（占位，未开发）
│   └── moments/
│       ├── index.html          # 说说列表（占位，未开发）
│       └── write_a_note.html   # "随笔一记"单个说说页（占位，未开发）
├── backend/                    # FastAPI 后端（uv 管理依赖，Python 3.11）
│   ├── pyproject.toml / uv.lock
│   ├── data/app.db             # SQLite 开发数据库（已 gitignore，不入库）
│   └── app/
│       ├── main.py             #   应用入口（建表 / CORS / 路由注册）
│       ├── database.py         #   SQLAlchemy 连接（DATABASE_URL 环境变量，默认 SQLite）
│       ├── models.py           #   ORM 模型（messages 表）
│       ├── schemas.py          #   Pydantic 请求/响应模型
│       └── routers/messages.py #   留言板 API：GET / POST /api/messages
└── vendors/
    └── lunar-javascript-1.7.3/ # 农历库（构建时原样复制进 dist；demo/tests 与站点无关）
```

---

## 页面功能一览

### 首页 `index.html`（唯一完整页面）

- **轮播图**：5 张相册照片，左右按钮 + 圆点指示器，5 秒自动播放，悬停暂停（`slider.js`）
- **最新动态**：博客文章卡片列表（含摘要 / 日期 / 阅读量）+「加载更多」按钮
- **侧栏**：
  - 作者卡片（头像 + `author-bio.js` 每次刷新随机换一条个性签名，共 9 条）
  - **日历卡片**：每秒更新的实时时间、日期、时段欢迎语，以及用 lunar 库计算的农历日期
  - 实用网站链接列表（17 条）
  - **音乐播放器卡片**：内置 10 首本地 mp3，随机切歌 / 播放暂停 / 静音 / 下一首，
    旋转封面 + 双高斯模糊背景；通过 `sessionStorage` 记录播放进度，**跨页面续播**
- **登录模态框**：账号 / 密码 / 注册按钮（仅有 UI，逻辑未完成）
- **点击爱心**：点击页面任意位置生成 ❤ 飘落动画
- 移动端汉堡菜单、返回顶部按钮（滚动超过 300px 显示）

### 关于页 `pages/about/index.html`

唯一有完整内容的子页面。用纯 CSS 单选按钮（`:checked` + 兄弟选择器）实现 5 个 Tab：
个人信息、求学经历、荣誉成就、兴趣爱好 / 未来规划、联系表单（无提交逻辑）。

### 其余子页面

留言板、说说、相册、博客文章页、随笔一记 —— 主内容区均为「还未开发」占位标题，
但共享完整的公共布局（header / 侧栏日历 / 音乐播放器 / 登录框 / 页脚）。

---

## 公共机制说明

- **公共布局组件化（2026-09 Vite 改造）**：header / 移动菜单 / 登录框 / 侧栏 / 页脚全部收拢到
  `src/js/components/layout.js`，各页面 HTML 里只留 `<div id="layout-header"></div>`、
  `<div id="layout-sidebar"></div>`、`<div id="layout-footer"></div>` 占位节点，由各页入口
  JS 在运行时注入。**改导航或侧栏只需改 layout.js 一个文件**。
  页面通过 `<body data-page="home|about|board|moments|moments-note|album|blog">`
  声明身份，layout.js 据此高亮对应导航项。
- **音乐跨页续播**：`music-card.js` 每秒把播放进度写入 `sessionStorage`
  （`currentMusicIndex` / `musicPosition` / `musicIsPlaying` / `musicIsMuted`），
  切换页面后从进度恢复播放。mp3/封面路径以字符串拼接 `/assets/music/...`，
  由 `vite.config.js` 中的 `copy-static-assets` 插件在构建时原样复制进 `dist`。
- **主题切换**：`body.dark` 类 + `localStorage['theme']` 持久化，全站生效。
- **lunar 库引入方式**：所有页面以经典 `<script src="/vendors/...">` 引入 lunar.js
  （在模块脚本之前执行，保证 `Lunar` 全局可用）；库文件构建时原样复制进 `dist/vendors`。
- **部署路径限制**：全部资源引用为根路径（`/assets/...`），站点必须部署在域名根目录
  （当前 GitHub Pages 用户主页 `ginyear17.github.io` 满足；项目页 `xxx.github.io/repo/` 不可用）。

---

## 本地运行与构建

```bash
# 前端
npm install        # 首次安装依赖
npm run dev        # 开发服务器（http://localhost:5173，/api 自动代理到后端）
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物

# 后端（另开终端）
cd backend
uv sync                         # 首次：按 uv.lock 创建虚拟环境并安装依赖
uv run uvicorn app.main:app --reload --port 8000
# 交互式 API 文档：http://localhost:8000/docs
```

留言板留言存在 `backend/data/app.db`（SQLite）；上线时通过环境变量切 PostgreSQL：

```bash
DATABASE_URL=postgresql+psycopg://user:password@host:5432/ginyear
```

## 部署（自建 Linux 服务器）

不再使用 GitHub Pages。使用 Docker Compose 一键部署（nginx + FastAPI + PostgreSQL）：

```bash
# 1. 服务器上安装 Docker 和 Docker Compose 插件（略）

# 2. 克隆代码，配置数据库密码
git clone https://github.com/Ginyear17/Ginyear17.github.io.git
cd Ginyear17.github.io
cp .env.example .env && vim .env   # 修改 POSTGRES_PASSWORD

# 3. 构建并启动（前端镜像内自动执行 vite build）
docker compose up -d --build

# 4. 验证
curl http://localhost/api/health   # {"status":"ok"}
curl http://localhost/api/messages
```

架构：`web`（nginx 托管构建产物 + 反代 `/api`）→ `api`（FastAPI/uvicorn）→ `db`（PostgreSQL 16，数据存 `pgdata` volume）。

> 若想直连服务器上**已有的** PostgreSQL 而不用内置容器：删掉 compose 里的 `db` 服务，
> 并把 `api` 的 `DATABASE_URL` 改为 `postgresql+psycopg://用户:密码@宿主机内网IP:5432/库名`。
>
> HTTPS：建议在服务器外层再放一层 Caddy / Nginx Proxy Manager 做证书，或改写 `deploy/nginx.conf`。

日常更新：

```bash
git pull && docker compose up -d --build
```

---

## ⚠️ 已知问题与未完成功能清单

> 写给未来忘记了这个项目的自己：以下是当时没做完 / 有 bug 的地方。

1. **5 个页面未开发**：留言板、说说、相册、博客文章正文、随笔一记，均只有占位标题。
2. **登录模态框仅演示**：`modal.js` 提交只打印到控制台并把头像设为默认图
   （原版调用未定义的 `updateUserInterface()` 会报错，已在 Vite 改造中修复）；注册按钮无任何逻辑。
3. **搜索与加载更多是占位**：`scripts.js` 中均为 `alert('...将在这里实现')`。
4. **音乐播放器**：进度条 / 播放时间显示的代码整段被注释掉未启用；
   `loadMusic` 自动播放失败的分支引用了未定义变量（被 catch 吞掉，无实际影响）。
5. **首页博客卡片**：两篇文章内容完全重复（复制粘贴）；文章页与首页摘要内容脱节。
6. **关于页**：联系表单 `action="#"` 无提交逻辑；文件头部有 `<hrml>` 拼写错误。
7. **页脚数据是假的**：访问量 / 访客量硬编码为 1；ICP 备案号为占位 `闽ICP备2025xxxxxx号-1`。
8. **首页博客卡片重复**：两篇文章内容完全重复（复制粘贴）。（已在原 README 误记字体/背景图为闲置资源，
   实际它们被 `base.css` 的 `@font-face` 和 `url()` 引用）
9. **SEO 弱**：所有页面 `<title>` 相同，无独立 meta description。
10. **无 `.nojekyll`**：纯静态无 `_` 开头目录，暂无影响，但若日后加入 Jekyll 会识别的目录需补上。
