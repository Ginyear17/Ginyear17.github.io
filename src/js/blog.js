// 博客模块：列表页 / 详情页 / 发布页 / 首页卡片 / 评论区 共用的取数与渲染逻辑
// 页面入口（src/js/pages/blog*.js、home.js）按各页面元素存在与否调用对应 init
import { renderMarkdown, highlightCode } from './markdown.js'
import { bindLike } from './moments.js'

const PAGE_SIZE = 10
const DEFAULT_COVER = '/assets/images/album/光影.jpg'

function escapeHtml(text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function formatDate(iso) {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 正文渲染：Markdown → 消毒后的安全 HTML（marked + DOMPurify，见 markdown.js） */
function renderContent(content) {
    return renderMarkdown(content)
}

/** 列表卡片（复用首页 .post 样式）：封面 + 标题 + 摘要 + 日期/浏览量/分类 */
export function blogCardHTML(blog) {
    const title = escapeHtml(blog.title)
    return `
    <article class="post">
        <div class="post-img-container">
            <a href="/pages/blog/detail.html?id=${blog.id}">
                <img src="${blog.cover || DEFAULT_COVER}" alt="${title}" class="post-img">
            </a>
        </div>
        <div class="post-content">
            <h3 class="post-title"><a href="/pages/blog/detail.html?id=${blog.id}">${title}</a></h3>
            <p class="post-excerpt">${escapeHtml(blog.summary)}</p>
            <div class="post-meta">
                <div class="post-stats">
                    <span class="post-stat">${formatDate(blog.created_at)}</span>
                    <span class="post-stat"><i class="fas fa-eye"></i> ${blog.views}</span>
                    <span class="post-stat"><i class="fas fa-heart"></i> ${blog.likes}</span>
                </div>
                <span class="post-category">${escapeHtml(blog.category)}</span>
            </div>
        </div>
    </article>`
}

/** 博客列表页（pages/blog/index.html）：分页加载 + 加载更多 */
export async function initBlogList() {
    const listEl = document.getElementById('blog-list')
    if (!listEl) return

    const moreBtn = document.getElementById('blog-more')
    let offset = 0

    async function load() {
        try {
            const res = await fetch(`/api/blogs?offset=${offset}&limit=${PAGE_SIZE}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const { total, items } = await res.json()
            if (offset === 0 && items.length === 0) {
                listEl.innerHTML = '<p class="blog-empty">还没有文章，快去写一篇吧～</p>'
            }
            for (const blog of items) {
                listEl.insertAdjacentHTML('beforeend', blogCardHTML(blog))
            }
            offset += items.length
            if (moreBtn) moreBtn.style.display = offset < total ? '' : 'none'
        } catch {
            if (offset === 0) listEl.innerHTML = '<p class="blog-empty">文章加载失败，请稍后再试（后端未启动？）</p>'
        }
    }

    moreBtn?.addEventListener('click', load)
    await load()

    // 「写博客」入口：仅站长登录后显示
    fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((user) => {
            if (user?.is_admin) document.getElementById('blog-write-link').style.display = ''
        })
        .catch(() => {})
}

/** 博客详情页（pages/blog/detail.html?id=xx）：按 id 取详情并渲染，浏览量由后端自增 */
export async function initBlogDetail() {
    const detailEl = document.getElementById('blog-detail')
    if (!detailEl) return

    const id = new URLSearchParams(location.search).get('id')
    if (!id || !/^\d+$/.test(id)) {
        detailEl.innerHTML = '<p class="blog-empty">缺少文章 ID，请从博客列表进入。</p>'
        return
    }

    try {
        const res = await fetch(`/api/blogs/${id}`)
        if (res.status === 404) {
            detailEl.innerHTML = '<p class="blog-empty">文章不存在或已被删除。</p>'
            return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blog = await res.json()

        document.title = `${blog.title} · 拾光小筑`
        detailEl.innerHTML = `
            <h2 class="blog-detail-title">${escapeHtml(blog.title)}</h2>
            <div class="blog-detail-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(blog.created_at)}</span>
                <span><i class="fas fa-eye"></i> ${blog.views}</span>
                <span class="post-category">${escapeHtml(blog.category)}</span>
            </div>
            <div class="blog-detail-content blog-md">${renderContent(blog.content)}</div>`
        // 代码块语法高亮（需在插入 DOM 后执行）
        highlightCode(detailEl.querySelector('.blog-detail-content'))
    } catch {
        detailEl.innerHTML = '<p class="blog-empty">文章加载失败，请稍后再试。</p>'
    }
}

/** 首页「最新动态」：取最新几篇博客替换原硬编码卡片 */
export async function initHomeBlogs(limit = 2) {
    const listEl = document.getElementById('home-blog-list')
    if (!listEl) return

    try {
        const res = await fetch(`/api/blogs?offset=0&limit=${limit}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { items } = await res.json()
        listEl.innerHTML = items.map(blogCardHTML).join('\n')
    } catch {
        // 后端不可用时保持空列表，不影响首页其它模块
    }
}

/** 写博客页（pages/blog/write.html）：标题/分类/封面/摘要/正文 → POST /api/blogs（需登录） */
export function initBlogForm() {
    const form = document.getElementById('blog-form')
    if (!form) return

    const titleInput = document.getElementById('blog-title')
    const categoryInput = document.getElementById('blog-category')
    const summaryInput = document.getElementById('blog-summary')
    const contentInput = document.getElementById('blog-content')
    const previewEl = document.getElementById('blog-preview')
    const coverInput = document.getElementById('blog-cover-input')
    const coverText = document.getElementById('blog-cover-text')
    const coverPreview = document.getElementById('blog-cover-preview')
    const countEl = document.getElementById('blog-char-count')
    const errorEl = document.getElementById('blog-form-error')
    const MAX_CHARS = 50000

    let coverUrl = ''

    // ===== 分栏实时预览：输入防抖 200ms 后渲染 Markdown =====
    let previewTimer
    function updatePreview() {
        clearTimeout(previewTimer)
        previewTimer = setTimeout(() => {
            const text = contentInput.value
            previewEl.hidden = !text.trim()
            previewEl.innerHTML = renderMarkdown(text)
            highlightCode(previewEl)
        }, 200)
    }
    contentInput.addEventListener('input', updatePreview)

    const submitBtn = form.querySelector('.blog-submit')

    // 发布权限检查：仅站长可发布，非站长（含未登录）隐藏表单并提示
    fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((user) => {
            if (user?.is_admin) return
            form.style.display = 'none'
            const notice = document.createElement('p')
            notice.className = 'blog-empty'
            notice.textContent = user
                ? '仅站长可发布博客。'
                : '发布博客需要先登录站长账号（点击右上角头像登录）。'
            form.after(notice)
        })
        .catch(() => {})

    function showError(msg) {
        errorEl.textContent = msg
        errorEl.style.display = msg ? '' : 'none'
    }

    // 正文字数统计
    function updateCount() {
        countEl.textContent = `${contentInput.value.length} / ${MAX_CHARS}`
    }
    contentInput.addEventListener('input', updateCount)
    updateCount()

    // 封面预览：上传成功后显示缩略图 + 移除按钮
    function renderCover() {
        coverPreview.innerHTML = coverUrl
            ? `<img src="${coverUrl}" alt="封面预览">
               <button type="button" class="blog-cover-remove" title="移除封面">&times;</button>`
            : ''
        coverPreview.style.display = coverUrl ? '' : 'none'
        coverText.textContent = coverUrl ? '重新上传封面' : '上传封面（可选）'
        coverPreview.querySelector('.blog-cover-remove')?.addEventListener('click', () => {
            coverUrl = ''
            renderCover()
        })
    }

    // 选图 → 立即上传（复用说说的 /api/upload）
    coverInput.addEventListener('change', async () => {
        const file = coverInput.files[0]
        coverInput.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) {
            showError('封面仅支持图片文件（jpg / png / gif / webp）')
            return
        }
        showError('')
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.detail || `HTTP ${res.status}`)
            }
            const { url } = await res.json()
            coverUrl = url
            renderCover()
        } catch (err) {
            showError(`封面上传失败：${err.message}`)
        }
    })

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const title = titleInput.value.trim()
        const content = contentInput.value.trim()
        if (!title || !content) return

        const payload = {
            title,
            category: categoryInput.value.trim(),
            summary: summaryInput.value.trim(),
            content,
            cover: coverUrl || null,
        }

        submitBtn.disabled = true
        submitBtn.textContent = '发布中...'
        try {
            const res = await fetch('/api/blogs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (res.status === 401) {
                showError('请先登录后再发布（点击右上角头像登录）')
                return
            }
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.detail || `HTTP ${res.status}`)
            }
            const blog = await res.json()
            location.href = `/pages/blog/detail.html?id=${blog.id}`
        } catch (err) {
            showError(`发布失败：${err.message}`)
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = '发布'
        }
    })
}

/** 博客详情页评论区（pages/blog/detail.html）：登录后可评论，支持点赞 */
export function initBlogComments() {
    const sectionEl = document.getElementById('blog-comments')
    const listEl = document.getElementById('blog-comment-list')
    const form = document.getElementById('blog-comment-form')
    if (!sectionEl || !listEl || !form) return

    const countEl = document.getElementById('blog-comment-count')
    const contentInput = document.getElementById('blog-comment-content')

    // 从 URL 拿文章 ID；无效则隐藏整个评论区
    const id = new URLSearchParams(location.search).get('id')
    if (!id || !/^\d+$/.test(id)) {
        sectionEl.style.display = 'none'
        return
    }

    // ===== 登录态适配：评论需登录（与说说评论一致） =====
    let loggedIn = false
    fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((user) => {
            loggedIn = !!user
            if (!loggedIn) {
                form.style.display = 'none'
                const tip = document.createElement('p')
                tip.className = 'comment-login-tip'
                tip.innerHTML = '登录后才能评论，<a href="#" id="goto-login">去登录 <i class="fas fa-angle-right"></i></a>'
                form.before(tip)
                tip.querySelector('#goto-login').addEventListener('click', (e) => {
                    e.preventDefault()
                    document.querySelector('.user-btn')?.click() // 打开登录模态框
                })
            }
        })
        .catch(() => {})

    function renderComment(c) {
        const item = document.createElement('div')
        item.className = 'moment-comment'
        item.innerHTML = `
      <div class="comment-header">
        <span class="comment-name"></span>
        <span class="comment-time"></span>
      </div>
      <div class="comment-body">
        <p class="comment-content"></p>
        <button type="button" class="like-btn comment-like" data-url="/api/blogs/${c.blog_id}/comments/${c.id}/like" data-key="blog_comment_${c.id}" aria-label="点赞">
          <i class="far fa-heart"></i> <span class="like-count">${c.likes ?? 0}</span>
        </button>
      </div>`
        item.querySelector('.comment-name').textContent = c.name
        item.querySelector('.comment-time').textContent = new Date(c.created_at).toLocaleString('zh-CN')
        item.querySelector('.comment-content').textContent = c.content
        item.querySelectorAll('.like-btn').forEach(bindLike)
        return item
    }

    async function loadComments() {
        try {
            const res = await fetch(`/api/blogs/${id}/comments`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (countEl) countEl.textContent = `（${data.total}）`
            listEl.innerHTML = ''
            if (!data.total) {
                listEl.innerHTML = '<p class="comment-empty">还没有评论，来说两句吧～</p>'
                return
            }
            data.items.forEach((c) => listEl.appendChild(renderComment(c)))
        } catch (err) {
            listEl.innerHTML = `<p class="comment-empty">评论加载失败：${err.message}</p>`
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        if (!loggedIn) {
            alert('请先登录后再评论')
            return
        }
        const content = contentInput.value.trim()
        if (!content) return

        const submitBtn = form.querySelector('button[type="submit"]')
        submitBtn.disabled = true
        submitBtn.textContent = '发表中...'
        try {
            const res = await fetch(`/api/blogs/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }), // 昵称由后端取当前登录用户名
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.detail || `HTTP ${res.status}`)
            }
            contentInput.value = ''
            await loadComments()
        } catch (err) {
            alert(`评论发表失败：${err.message}`)
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = '发表评论'
        }
    })

    loadComments()
}
