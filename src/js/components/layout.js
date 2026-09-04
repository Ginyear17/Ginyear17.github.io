// 公共布局组件：Header（含移动端菜单、登录模态框）、Sidebar、Footer
// 由 src/js/main.js 注入到各页面的 #layout-* 占位节点中
// 导航/侧栏/页脚只需改这一处，全站生效
import logoUrl from '../../../assets/images/logo.webp'
import avatarUrl from '../../../assets/images/avatars/avatar-main.webp'

export { avatarUrl }

const NAV_ITEMS = [
    { key: 'home', label: '首页', href: '/index.html' },
    { key: 'board', label: '留言板', href: '/pages/board/index.html' },
    { key: 'moments', label: '说说', href: '/pages/moments/index.html' },
    { key: 'album', label: '相册', href: '/pages/album/index.html' },
    { key: 'about', label: '关于', href: '/pages/about/index.html' },
]

// 各页面 <body data-page="..."> 对应的导航高亮项
const ACTIVE_MAP = {
    home: 'home',
    board: 'board',
    moments: 'moments',
    'moments-note': 'moments',
    album: 'album',
    about: 'about',
    blog: '',
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
                <span class="logo-text">小杰的杂物间</span>
            </a>

            <!-- Desktop Navigation -->
            <nav class="nav">
                <ul class="nav-list">
                ${renderNavLinks('nav-link')}
                </ul>
            </nav>

            <!-- Header Actions -->
            <div class="header-actions">
                <button class="icon-btn user-btn" aria-label="个人中心">
                    <img id="user-avatar" src="" alt="用户头像" style="display: none;">
                    <i id="user-icon" class="fas fa-user-circle"></i>
                </button>
                <button class="icon-btn search-btn" aria-label="搜索">
                    <i class="fas fa-search"></i>
                </button>
                <button class="icon-btn theme-toggle" aria-label="切换主题">
                    <i class="fas fa-sun"></i>
                </button>
                <button class="icon-btn menu-btn" aria-label="菜单">
                    <i class="fas fa-bars"></i>
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
                <div class="button-group">
                    <button type="button" id="register-btn">注册</button>
                    <button type="submit">登录</button>
                </div>
            </form>
        </div>
    </div>`
}

// 侧栏「实用网站」链接列表
const USEFUL_SITES = [
    ['在问AI', 'https://zaiwen.xueban.org.cn/chat/working-edition'],
    ['哔哩哔哩bilibili', 'https://www.bilibili.com/'],
    ['i集大', 'https://cas.paas.jmu.edu.cn/cas/login'],
    ['i集大vpn入口', 'https://cas-paas-443.webvpn.jmu.edu.cn/cas/login'],
    ['doyoudo', 'https://www.doyoudo.com/'],
    ['食用手册', 'https://cook.yunyoujun.cn/'],
    ['导数分步计算器', 'https://mathdf.com/der/cn/'],
    ['积分分步计算器', 'https://mathdf.com/int/cn/'],
    ['多个PDF合并', 'https://docsmall.com/pdf-merge'],
    ['几何-geogebra', 'https://www.geogebra.org/geometry'],
    ['HTML（超文本标记语言） | MDN', 'https://developer.mozilla.org/zh-CN/docs/Web/HTML'],
    ['CSS 选择器 - 学习 Web 开发 | MDN', 'https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Styling_basics/Basic_selectors'],
    ['color - CSS：层叠样式表 | MDN', 'https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value'],
    ['基本文本和字体样式 - 学习 Web 开发 | MDN', 'https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Text_styling/Fundamentals'],
    ['CSS 构建 - 学习 Web 开发 | MDN', 'https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Styling_basics'],
    ['The Type — 文字 / 设计 / 文化', 'https://www.thetype.com/'],
    ['derp自建教程', 'https://gitee.com/imajeason/nas_tools/tree/master/tailscale'],
]

const RECENT_POSTS = [
    ['阿里云域名绑定动态ip', '/pages/blog/aliyun_ddns.html'],
    ['随笔一记', '/pages/moments/write_a_note.html'],
]

export function sidebarHTML() {
    const usefulSites = USEFUL_SITES.map(
        ([label, href]) => `
                        <li class="recent-post-item">
                            <a href="${href}" class="recent-post-link">${label}</a>
                            <i class="fas fa-link recent-post-icon"></i>
                        </li>`
    ).join('')

    const recentPosts = RECENT_POSTS.map(
        ([label, href]) => `
                        <li class="recent-post-item">
                            <a href="${href}" class="recent-post-link">${label}</a>
                            <i class="fas fa-link recent-post-icon"></i>
                        </li>`
    ).join('')

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

            <div class="card">
                <div class="card-content">
                    <h3 class="section-title"><i class="fas fa-fire"></i> 实用网站</h3>
                    <ul class="recent-posts-list">${usefulSites}
                    </ul>
                </div>
            </div>

            <!-- Recent Posts -->
            <div class="card">
                <div class="card-content">
                    <h3 class="section-title"><i class="fas fa-fire"></i> 最新动态</h3>
                    <ul class="recent-posts-list">${recentPosts}
                    </ul>
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
                <p>2025 © <a href="/" class="footer-link">小杰的杂物间</a> -
                    <a href="https://beian.miit.gov.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="footer-link">
                        闽ICP备2025xxxxxx号-1
                    </a>
                </p>
                <p>This is a courseworkDesign</p>
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
                    <span>访问量：1</span>
                    <span>访客量：1</span>
                </div>
            </div>
        </div>
    </footer>`
}
