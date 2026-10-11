// 公共布局组件：Header（含移动端菜单、登录模态框）、Sidebar、Footer
// 由 src/js/main.js 注入到各页面的 #layout-* 占位节点中
// 导航/侧栏/页脚只需改这一处，全站生效
import logoUrl from '../../../assets/images/logo.webp'
import avatarUrl from '../../../assets/images/avatars/avatar-main.webp'

export { avatarUrl }

const NAV_ITEMS = [
    { key: 'home', label: '首页', href: '/index.html' },
    { key: 'blog', label: '博客', href: '/pages/blog/index.html' },
    { key: 'board', label: '留言板', href: '/pages/board/index.html' },
    { key: 'moments', label: '说说', href: '/pages/moments/index.html' },
    { key: 'album', label: '相册', href: '/pages/album/index.html' },
    { key: 'about', label: '关于', href: '/pages/about/index.html' },
]

// 开站时间：页脚「小筑亮灯第 N 天」的起算日，开站当天记为第 1 天
const SITE_START_DATE = new Date(2026, 9, 11) // 2026-10-11

// 按本地日历日计算已开站天数（避免跨天时因时刻差导致数量偏差）
function daysSinceStart() {
    const now = new Date()
    const startDay = new Date(
        SITE_START_DATE.getFullYear(),
        SITE_START_DATE.getMonth(),
        SITE_START_DATE.getDate()
    )
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.round((today - startDay) / 86400000) + 1
}

// 各页面 <body data-page="..."> 对应的导航高亮项
const ACTIVE_MAP = {
    home: 'home',
    blog: 'blog',
    board: 'board',
    moments: 'moments',
    'moments-note': 'moments',
    'moments-detail': 'moments',
    album: 'album',
    about: 'about',
}

function renderNavLinks(linkClass) {
    const activeKey = ACTIVE_MAP[document.body.dataset.page] ?? ''
    return NAV_ITEMS.map(
        (item) =>
            `<li><a href="${item.href}" class="${linkClass}${item.key === activeKey ? ' active' : ''}">${item.label}</a></li>`
    ).join('\n            ')
}

export function headerHTML() {
    return `
    <header class="header">
        <div class="container header-container">
            <!--Logo-->
            <a href="/" class="logo">
                <img src="${logoUrl}" alt="Logo">
                <span class="logo-text">拾光小筑</span>
            </a>

            <!-- Desktop Navigation -->
            <nav class="nav">
                <ul class="nav-list">
                ${renderNavLinks('nav-link')}
                </ul>
            </nav>

            <!-- Header Actions：个人中心放最右侧 -->
            <div class="header-actions">
                <button class="icon-btn search-btn" aria-label="搜索">
                    <i class="fas fa-search"></i>
                </button>
                <button class="icon-btn theme-toggle" aria-label="切换主题">
                    <i class="fas fa-sun"></i>
                </button>
                <button class="icon-btn menu-btn" aria-label="菜单">
                    <i class="fas fa-bars"></i>
                </button>
                <button class="icon-btn user-btn" aria-label="个人中心">
                    <img id="user-avatar" src="" alt="用户头像" style="display: none;">
                    <i id="user-icon" class="fas fa-user-circle"></i>
                </button>
            </div>
        </div>
    </header>

    <!--Mobile Menu-->
    <div class=" overlay"></div>
    <div class="mobile-menu">
        <div class="mobile-menu-header">
            <h3>菜单</h3>
            <button class="icon-btn close-menu-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <ul class="mobile-menu-list">
            ${renderNavLinks('mobile-menu-link')}
        </ul>
    </div>

    <!-- 登录模态框 -->
    <div id="login-modal" class="modal">
        <div class="modal-content">
            <span class="close-button">&times;</span>

            <!-- 未登录：登录表单 -->
            <div id="login-view">
                <h2>登录</h2>
                <form id="login-form">
                    <div class="form-group">
                        <div class="label-group">
                            <label for="username">账号</label>
                            <input type="text" id="username" name="username" required>
                        </div>
                        <div class="label-group">
                            <label for="password">密码</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                    </div>
                    <div class="form-error" id="login-error-msg"></div>
                    <div class="button-group">
                        <button type="button" id="register-btn">注册</button>
                        <button type="submit">登录</button>
                    </div>
                </form>
            </div>

            <!-- 已登录：个人信息 + 退出 -->
            <div id="profile-view" style="display: none;">
                <h2>个人中心</h2>
                <p class="profile-username"><i class="fas fa-user-circle"></i> <span id="profile-username-text"></span></p>
                <div class="button-group">
                    <button type="button" id="profile-center-btn" class="profile-center-link">进入个人中心</button>
                </div>
                <div class="button-group">
                    <button type="button" id="logout-btn">退出登录</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 注册模态框（邮箱验证码注册） -->
    <div id="register-modal" class="modal">
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2>注册</h2>
            <form id="register-form">
                <div class="form-group">
                    <div class="label-group">
                        <label for="new-username">用户名</label>
                        <input type="text" id="new-username" name="new-username" maxlength="20" required>
                    </div>
                    <div class="label-group">
                        <label for="new-email">邮箱</label>
                        <input type="email" id="new-email" name="new-email" required>
                    </div>
                    <div class="label-group label-group-code">
                        <label for="verification-code">验证码</label>
                        <input type="text" id="verification-code" name="verification-code" maxlength="6" required>
                        <button type="button" id="send-code-btn" class="btn-send-code">发送验证码</button>
                    </div>
                    <div class="label-group">
                        <label for="new-password">密码</label>
                        <input type="password" id="new-password" name="new-password" minlength="6" required>
                    </div>
                    <div class="label-group">
                        <label for="confirm-password">确认密码</label>
                        <input type="password" id="confirm-password" name="confirm-password" required>
                    </div>
                </div>
                <div class="form-error" id="register-error-msg"></div>
                <div class="button-group">
                    <button type="button" id="back-to-login-btn">返回登录</button>
                    <button type="submit" id="register-submit-btn">注册</button>
                </div>
            </form>
        </div>
    </div>`
}

// ===== 侧栏「最新动态」：实时拉取最新文章 + 说说，按时间倒序合并展示 =====

function escapeHtml(text) {
    return String(text ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function relativeTime(iso) {
    const d = new Date(iso)
    if (isNaN(d)) return ''
    const diff = Date.now() - d.getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return '刚刚'
    if (min < 60) return `${min}分钟前`
    const hour = Math.floor(min / 60)
    if (hour < 24) return `${hour}小时前`
    const day = Math.floor(hour / 24)
    if (day < 7) return `${day}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
}

function recentItemHTML(item) {
    const isBlog = item.type === 'blog'
    const label = isBlog ? '文章' : '说说'
    const icon = isBlog ? 'fa-file-lines' : 'fa-feather'
    const title = isBlog ? item.title : item.content
    const href = isBlog
        ? `/pages/blog/detail.html?id=${item.id}`
        : `/pages/moments/detail.html?id=${item.id}`
    return `
                        <li class="recent-post-item">
                            <a href="${href}" class="recent-post-link" title="${escapeHtml(title)}">
                                <span class="recent-post-badge ${isBlog ? 'blog' : 'moment'}"><i class="fas ${icon}"></i>${label}</span>
                                <span class="recent-post-text">${escapeHtml(title)}</span>
                            </a>
                            <span class="recent-post-time">${relativeTime(item.created_at)}</span>
                        </li>`
}

/** 侧栏「最新动态」：合并最新文章 + 说说实时展示，每分钟自动刷新 */
export async function initSidebarRecent() {
    const listEl = document.getElementById('sidebar-recent-list')
    if (!listEl) return

    async function load() {
        try {
            const [blogRes, momentRes] = await Promise.all([
                fetch('/api/blogs?offset=0&limit=5'),
                fetch('/api/moments?offset=0&limit=5'),
            ])
            if (!blogRes.ok || !momentRes.ok) throw new Error('HTTP error')
            const [blogs, moments] = await Promise.all([blogRes.json(), momentRes.json()])

            const items = [
                ...(blogs.items || []).map((b) => ({ type: 'blog', id: b.id, title: b.title, created_at: b.created_at })),
                ...(moments.items || []).map((m) => ({ type: 'moment', id: m.id, content: m.content, created_at: m.created_at })),
            ]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 6)

            const html = items.map(recentItemHTML).join('\n')
                || '<li class="recent-post-item"><span class="recent-post-text">暂无动态</span></li>'
            if (listEl.innerHTML !== html) listEl.innerHTML = html
        } catch {
            // 后端不可用时保持占位，不影响侧栏其它模块
        }
    }

    await load()
    setInterval(load, 60000)
}

export function sidebarHTML() {
    return `
        <aside class="sidebar">
            <!--Author Card-->
            <div class="card">
                <div class="author-card-header">
                    <img src="https://images.wallpaperscraft.com/image/single/man_cube_wire_1164789_1280x720.jpg"
                    alt="Profile background">
                </div>
                <div class="author-card-content">
                    <img src="${avatarUrl}" alt="Profile" class="author-avatar">
                    <h3 class="author-name">𝓣𝓼°𝓒 𝓢𝓱𝓪𝓭𝓸𝔀</h3>
                    <p class="author-bio" id="author-bio"></p>

                    <div class="author-stats">
                        <div class="author-stat">
                            <div class="author-stat-value">1</div>
                            <div class="author-stat-label">说说数</div>
                        </div>
                        <div class="author-stat">
                            <div class="author-stat-value">1</div>
                            <div class="author-stat-label">文章数</div>
                        </div>
                        <div class="author-stat">
                            <div class="author-stat-value">0</div>
                            <div class="author-stat-label">评论数</div>
                        </div>
                    </div>

                    <div class="social-links">
                    <a href="https://github.com/Ginyear17" target="_blank" rel="noopener noreferrer" class="social-link">
                        <i class="fab fa-github"></i>
                    </a>
                    <a href="mailto:2579478356@qq.com" target="_blank" rel="noopener noreferrer" class="social-link">
                        <i class="fas fa-envelope"></i>
                    </a>
                    <a href="https://steamcommunity.com/profiles/76561198938092807/" target="_blank" rel="noopener noreferrer" class="social-link">
                        <i class="fab fa-steam"></i>
                    </a>
                    </div>
                </div>
            </div>

            <!-- 日历卡片 -->
            <div class="card calendar-card">
                <div class="calendar-row">
                    <div id="current-time" class="calendar-time"></div>
                    <div id="current-date" class="calendar-date"></div>
                </div>
                <div style="height: 20px;"></div>
                <div class="calendar-row">
                    <div></div>
                    <div id="lunar-date" class="lunar-date"></div>
                </div>
                <div class="calendar-row">
                    <div id="welcome-message" class="welcome-message"></div>
                    <div class="calendar-song">春雨惊春清谷天，夏满芒夏暑相连。<br>秋处露秋寒霜降，冬雪雪冬小大寒。</div>
                </div>
            </div>

            <!-- Recent Posts：实时展示最新文章 + 说说，由 initSidebarRecent 拉取后端数据渲染 -->
            <div class="card">
                <div class="card-content">
                    <h3 class="section-title"><i class="fas fa-fire"></i> 最新动态</h3>
                    <ul class="recent-posts-list" id="sidebar-recent-list"></ul>
                </div>
            </div>

            <div class="card music-card-special">
                <div class="musci-card">
                    <div id="blurred-background0"></div>
                    <div id="blurred-background1"></div>
                    <div style="height: 15px;"></div>
                    <div class="rotating-img">
                        <img src="" alt="Album Cover" class="music-avatar" id="music-cover">
                    </div>
                    <h6 id="music-info"></h6>
                    <audio id="music-player"></audio>

                    <div class="custom-controls">
                        <button id="volume-btn"><i class="fas fa-volume-up"></i></button>
                        <button style="font-size: 1.6rem;" id="play-pause-btn"><i class="fas fa-pause"></i></button>
                        <button id="next-btn"><i class="fas fa-forward-step"></i></button>
                    </div>
                </div>
            </div>

        </aside>`
}

export function footerHTML() {
    return `
    <footer class="footer">
        <div class="container footer-container">
            <div class="footer-info">
                <p>2026 © <a href="/" class="footer-link">拾光小筑</a> -
                    <a href="https://beian.miit.gov.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="footer-link">
                        闽ICP备2025xxxxxx号-1
                    </a>
                </p>
                <p>树影与窗，拾光而居  |  小筑亮灯第 <span class="footer-days-num">${daysSinceStart()}</span> 天</p>
            </div>
            <div>
                <div class="footer-links">
                    <a href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="footer-link">
                        站点地图
                    </a>
                </div>
                <div class="footer-stats">
                    <!-- 访问量/访客量：由 main.js 的 initSiteStats 从后端 /api/stats 实时拉取 -->
                    <span id="footer-pv">访问量：--</span>
                    <span id="footer-uv">访客量：--</span>
                </div>
            </div>
        </div>
    </footer>`
}
