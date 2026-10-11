// 说说：接入 FastAPI 后端 /api/moments（开发时经 Vite 代理转发）
// 依赖：vendors/lunar-javascript 全局 Lunar（用于农历日期展示）
// 提供四个初始化函数：initMoments（列表）/ initMomentDetail（详情）/ initMomentForm（发布）/ initMomentComments（评论）

// ===== 公共工具（模块级，供列表/详情共用） =====
function relativeTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min} 分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} 小时前`;
    const day = Math.floor(hour / 24);
    if (day < 7) return `${day} 天前`;
    return d.toLocaleDateString('zh-CN');
}

function lunarText(iso) {
    try {
        const lunar = window.Lunar.fromDate(new Date(iso));
        const cn = ['一', '二', '三', '四', '五', '六', '日'];
        return `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} · 星期${cn[(new Date(iso).getDay() + 6) % 7]}`;
    } catch {
        return '';
    }
}

// 完整时间（详情页用，列表页是相对时间）
function fullTime(iso) {
    const d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleString('zh-CN');
}

/**
 * 图片灯箱：点击配图弹出大图
 * 多图支持左右切换（含键盘 ←/→），Esc / 点遮罩 / 点关闭按钮关闭
 * 缩放手势：滚轮缩放、双击放大/还原、移动端双指捏合、放大后可拖拽平移
 * （导出供相册页复用）
 */
export function openLightbox(images, startIndex = 0) {
    if (document.querySelector('.lightbox-overlay')) return; // 避免重复弹出

    let index = startIndex;
    let scale = 1, tx = 0, ty = 0; // 缩放与平移状态
    const MIN_SCALE = 1, MAX_SCALE = 5;

    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="关闭">&times;</button>
    <button type="button" class="lightbox-nav lightbox-prev" aria-label="上一张">&#8249;</button>
    <img class="lightbox-img" alt="配图大图">
    <button type="button" class="lightbox-nav lightbox-next" aria-label="下一张">&#8250;</button>
    <div class="lightbox-tools">
      <button type="button" class="lightbox-tool" data-act="out" aria-label="缩小">&minus;</button>
      <button type="button" class="lightbox-tool" data-act="in" aria-label="放大">&plus;</button>
      <button type="button" class="lightbox-tool" data-act="reset" aria-label="重置">1:1</button>
    </div>
    <span class="lightbox-counter"></span>`;

    const img = overlay.querySelector('.lightbox-img');
    const prevBtn = overlay.querySelector('.lightbox-prev');
    const nextBtn = overlay.querySelector('.lightbox-next');
    const counter = overlay.querySelector('.lightbox-counter');

    // ===== 缩放与平移 =====
    function apply() {
        img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        img.style.cursor = scale > 1 ? 'grab' : 'default';
    }

    function setScale(v) {
        scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
        if (scale === MIN_SCALE) { tx = 0; ty = 0; } // 复位时清空平移
        apply();
    }

    function show() {
        img.src = images[index];
        scale = 1; tx = 0; ty = 0; // 切图重置缩放
        apply();
        const multi = images.length > 1;
        prevBtn.style.display = nextBtn.style.display = multi ? '' : 'none';
        counter.textContent = multi ? `${index + 1} / ${images.length}` : '';
    }

    function close() {
        overlay.classList.add('closing');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        document.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft' && index > 0) { index--; show(); }
        if (e.key === 'ArrowRight' && index < images.length - 1) { index++; show(); }
        if (e.key === '+' || e.key === '=') setScale(scale * 1.25);
        if (e.key === '-') setScale(scale / 1.25);
    }

    // 滚轮缩放
    overlay.addEventListener('wheel', (e) => {
        e.preventDefault();
        setScale(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    }, { passive: false });

    // 双击：放大 2.5 倍 / 还原
    img.addEventListener('dblclick', () => setScale(scale > 1 ? 1 : 2.5));

    // 放大后拖拽平移
    let dragging = false, sx = 0, sy = 0, bx = 0, by = 0;
    img.addEventListener('pointerdown', (e) => {
        if (scale <= MIN_SCALE) return;
        dragging = true;
        sx = e.clientX; sy = e.clientY; bx = tx; by = ty;
        img.setPointerCapture(e.pointerId);
        img.style.cursor = 'grabbing';
    });
    img.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        tx = bx + (e.clientX - sx);
        ty = by + (e.clientY - sy);
        apply();
    });
    img.addEventListener('pointerup', () => {
        dragging = false;
        img.style.cursor = scale > 1 ? 'grab' : 'default';
    });

    // 移动端双指捏合缩放
    let pinchBase = 0, pinchScale = 1;
    overlay.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const [a, b] = e.touches;
            pinchBase = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            pinchScale = scale;
            e.preventDefault();
        }
    }, { passive: false });
    overlay.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && pinchBase > 0) {
            const [a, b] = e.touches;
            const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            setScale(pinchScale * (d / pinchBase));
            e.preventDefault();
        }
    }, { passive: false });
    overlay.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) pinchBase = 0;
    });

    // 工具按钮：+ / − / 1:1
    overlay.querySelectorAll('.lightbox-tool').forEach((tool) => {
        tool.addEventListener('click', (e) => {
            e.stopPropagation();
            const act = tool.dataset.act;
            if (act === 'in') setScale(scale * 1.25);
            if (act === 'out') setScale(scale / 1.25);
            if (act === 'reset') setScale(MIN_SCALE);
        });
    });

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); index = (index - 1 + images.length) % images.length; show(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); index = (index + 1 + images.length) % images.length; show(); });
    // 点遮罩关闭（图片本体不关闭，避免与缩放/双击冲突）
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.lightbox-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    show();
}

// 轻提示（复制成功等），2 秒自动消失
function showToast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
    }, 2000);
}

/**
 * 点赞按钮（账号绑定）：需登录，一个账号对一个目标只能赞一次。
 * 按钮需带 data-type（moment/moment_comment/blog/blog_comment/message）和 data-id。
 * 初始状态从后端 /api/likes/status 拉取；点击 POST/DELETE /api/likes/{type}/{id}。
 * 导出供博客评论 / 留言板等模块复用。
 */
export function bindLike(btn) {
    const type = btn.dataset.type;
    const id = btn.dataset.id;
    if (!type || !id) return;
    const countEl = btn.querySelector('.like-count');
    // 图标与颜色跟随状态
    const sync = (liked, likes) => {
        btn.classList.toggle('liked', liked);
        btn.querySelector('i').className = liked ? 'fas fa-heart' : 'far fa-heart';
        if (likes !== undefined && countEl) countEl.textContent = likes;
    };
    // 初始状态：账号绑定，从后端拉取
    fetch(`/api/likes/status?type=${type}&ids=${id}`)
        .then((r) => r.json())
        .then((m) => { const s = m[String(id)]; if (s) sync(s.liked, s.likes); })
        .catch(() => {});

    btn.addEventListener('click', async () => {
        // 点赞需登录
        const me = await fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (!me) { document.querySelector('.user-btn')?.click(); return; }
        const wasLiked = btn.classList.contains('liked');
        btn.disabled = true;
        try {
            const res = await fetch(`/api/likes/${type}/${id}`, { method: wasLiked ? 'DELETE' : 'POST' });
            if (res.status === 401) { document.querySelector('.user-btn')?.click(); return; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { likes, liked } = await res.json();
            sync(liked, likes);
        } catch (err) {
            alert(`点赞操作失败：${err.message}`);
        } finally {
            btn.disabled = false;
        }
    });
}

/** 内联回复表单：点「回复」展开，提交后触发 onReload 刷新评论区 */
export function createReplyForm(parentId, replyUrl, onReload) {
    const form = document.createElement('form');
    form.className = 'reply-form';
    form.innerHTML = `
      <textarea placeholder="回复...（500 字以内）" maxlength="500" required></textarea>
      <div class="reply-form-footer">
        <button type="button" class="reply-cancel">取消</button>
        <button type="submit">回复</button>
      </div>`;
    form.querySelector('.reply-cancel').addEventListener('click', () => form.remove());
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = form.querySelector('textarea').value.trim();
        if (!content) return;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
            const res = await fetch(replyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, parent_id: parentId }),
            });
            if (res.status === 401) { document.querySelector('.user-btn')?.click(); return; }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            form.remove();
            onReload?.();
        } catch (err) {
            alert(`回复失败：${err.message}`);
            submitBtn.disabled = false;
        }
    });
    return form;
}

/** 单条评论元素（顶层评论）：正文 + 点赞 + 回复按钮 + 嵌套回复列表 */
export function createCommentElement(c, ctx) {
    const item = document.createElement('div');
    item.className = 'moment-comment';
    item.innerHTML = `
      <div class="comment-header">
        <span class="comment-name"></span>
        <span class="comment-time"></span>
      </div>
      <div class="comment-body">
        <p class="comment-content"></p>
        <span class="comment-actions">
          <button type="button" class="like-btn comment-like" data-type="${ctx.likeType}" data-id="${c.id}" aria-label="点赞">
            <i class="far fa-heart"></i> <span class="like-count">${c.likes ?? 0}</span>
          </button>
          <button type="button" class="reply-toggle"><i class="fas fa-reply"></i> 回复</button>
        </span>
      </div>
      <div class="comment-replies"></div>`;
    item.querySelector('.comment-name').textContent = c.name;
    item.querySelector('.comment-time').textContent = relativeTime(c.created_at);
    item.querySelector('.comment-content').textContent = c.content;
    item.querySelector('.like-btn').addEventListener('click', null); // 占位防重复
    item.querySelectorAll('.like-btn').forEach(bindLike);

    // 回复按钮 → 内联回复表单（挂在评论下的 replies 容器里）
    const repliesEl = item.querySelector('.comment-replies');
    item.querySelector('.reply-toggle').addEventListener('click', () => {
        const existing = repliesEl.querySelector('.reply-form');
        if (existing) { existing.remove(); return; }
        repliesEl.appendChild(createReplyForm(c.id, ctx.replyUrl, ctx.onReload));
    });

    // 嵌套回复（旧 → 新）
    (c.replies || []).forEach((r) => {
        const rEl = document.createElement('div');
        rEl.className = 'comment-reply';
        rEl.innerHTML = `
          <div class="comment-header">
            <span class="comment-name"></span>
            <span class="comment-time"></span>
          </div>
          <div class="comment-body">
            <p class="comment-content"></p>
            <span class="comment-actions">
              <button type="button" class="like-btn comment-like" data-type="${ctx.likeType}" data-id="${r.id}" aria-label="点赞">
                <i class="far fa-heart"></i> <span class="like-count">${r.likes ?? 0}</span>
              </button>
              <button type="button" class="reply-toggle"><i class="fas fa-reply"></i> 回复</button>
            </span>
          </div>`;
        rEl.querySelector('.comment-name').textContent = r.name;
        rEl.querySelector('.comment-time').textContent = relativeTime(r.created_at);
        rEl.querySelector('.comment-content').textContent = r.content;
        rEl.querySelectorAll('.like-btn').forEach(bindLike);
        // 回复某条回复：后端会归一化挂到顶层评论下
        rEl.querySelector('.reply-toggle').addEventListener('click', () => {
            const existing = rEl.querySelector('.reply-form');
            if (existing) { existing.remove(); return; }
            rEl.appendChild(createReplyForm(r.id, ctx.replyUrl, ctx.onReload));
        });
        repliesEl.appendChild(rEl);
    });
    return item;
}

/**
 * 渲染单条说说卡片
 * @param {object} msg 后端 MomentOut
 * @param {object} opts list:true 时带「查看详情」链接、点击正文跳详情
 */
function renderMoment(msg, { list = false } = {}) {
    const item = document.createElement('div');
    item.className = 'moment-item';
    const count = msg.comment_count ?? 0;
    const preview = msg.top_comments || [];
    // 列表页评论预览：按点赞数最多展示 3 条，更多则引导去详情页查看全部
    const previewHtml = list && preview.length
        ? `<div class="moment-comment-preview"></div>
           ${count > preview.length ? `<a class="comment-more" href="./detail.html?id=${msg.id}">查看全部 ${count} 条评论 <i class="fas fa-angle-right"></i></a>` : ''}`
        : '';
    item.innerHTML = `
      <p class="moment-content"></p>
      <div class="moment-images"></div>
      ${previewHtml}
      <div class="moment-meta">
        <span class="moment-time"></span>
        <span class="moment-lunar"></span>
        ${list ? `<a class="moment-comments" href="./detail.html?id=${msg.id}"><i class="fas fa-comment"></i> <span class="count">${count}</span></a>` : ''}
        <button type="button" class="like-btn" data-type="moment" data-id="${msg.id}" aria-label="点赞">
          <i class="far fa-heart"></i> <span class="like-count">${msg.likes ?? 0}</span>
        </button>
        ${list ? '<a class="moment-link">查看详情 <i class="fas fa-angle-right"></i></a>' : ''}
      </div>`;
    item.querySelector('.moment-content').textContent = msg.content;
    item.querySelector('.moment-time').textContent = relativeTime(msg.created_at);
    item.querySelector('.moment-lunar').textContent = lunarText(msg.created_at);

    // 填充评论预览（textContent 防 XSS），点赞数可点击（复用 bindLike 切换逻辑）
    const previewEl = item.querySelector('.moment-comment-preview');
    if (previewEl) {
        preview.forEach((c) => {
            const line = document.createElement('p');
            line.className = 'preview-line';
            line.innerHTML = `<span class="preview-name"></span><span class="preview-text"></span>
              <button type="button" class="like-btn preview-like" data-type="moment_comment" data-id="${c.id}" aria-label="点赞">
                <i class="far fa-heart"></i> <span class="like-count"></span>
              </button>`;
            line.querySelector('.preview-name').textContent = `${c.name}：`;
            line.querySelector('.preview-text').textContent = c.content;
            line.querySelector('.like-count').textContent = c.likes ?? 0;
            previewEl.appendChild(line);
        });
    }

    const images = msg.images || [];
    const imgsEl = item.querySelector('.moment-images');
    if (images.length === 1) imgsEl.classList.add('single');
    images.forEach((url, i) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '说说配图';
        img.loading = 'lazy';
        // 点击打开灯箱（不再跳新窗口）
        img.addEventListener('click', () => openLightbox(images, i));
        imgsEl.appendChild(img);
    });

    if (list) {
        item.querySelector('.moment-link').href = `./detail.html?id=${msg.id}`;
        // 点击正文也可进详情
        item.querySelector('.moment-content').addEventListener('click', () => {
            location.href = `./detail.html?id=${msg.id}`;
        });
    }
    // 绑定点赞按钮
    item.querySelectorAll('.like-btn').forEach(bindLike);
    return item;
}

// ===== 列表页 =====
export function initMoments() {
    const listEl = document.getElementById('moment-list');
    if (!listEl) return;

    const countEl = document.getElementById('moment-count');
    const moreBtn = document.getElementById('moment-more');
    const PAGE_SIZE = 10;
    let offset = 0;
    let total = 0;

    async function loadMore() {
        moreBtn.disabled = true;
        moreBtn.textContent = '加载中...';
        try {
            const res = await fetch(`/api/moments?offset=${offset}&limit=${PAGE_SIZE}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            total = data.total;
            offset += data.items.length;
            if (countEl) countEl.textContent = `共 ${total} 条说说`;
            // 首批返回后清掉占位/错误提示
            if (offset === data.items.length) listEl.innerHTML = '';
            data.items.forEach((m) => listEl.appendChild(renderMoment(m, { list: true })));
            moreBtn.style.display = offset < total ? '' : 'none';
            if (!total) {
                listEl.innerHTML = '<p class="moment-empty">还没有说说，去「随笔一记」写下第一条吧～</p>';
            }
        } catch (err) {
            listEl.innerHTML = `<p class="moment-empty">说说加载失败：${err.message}（后端启动了吗？）</p>`;
        } finally {
            moreBtn.disabled = false;
            moreBtn.textContent = '加载更多';
        }
    }

    moreBtn.addEventListener('click', loadMore);
    loadMore();
}

// ===== 详情页 =====
export function initMomentDetail() {
    const detailEl = document.getElementById('moment-detail');
    if (!detailEl) return;

    const id = new URLSearchParams(location.search).get('id');
    if (!id || !/^\d+$/.test(id)) {
        detailEl.innerHTML = '<p class="moment-empty">缺少说说 ID，请从<a href="./index.html">说说列表</a>进入～</p>';
        return;
    }

    detailEl.innerHTML = '<p class="moment-empty">加载中...</p>';
    fetch(`/api/moments/${id}`)
        .then(async (res) => {
            if (res.status === 404) {
                detailEl.innerHTML = '<p class="moment-empty">说说不存在或已被删除。<a href="./index.html">返回列表</a></p>';
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const msg = await res.json();

            detailEl.innerHTML = '';
            const card = renderMoment(msg);
            card.querySelector('.moment-time').textContent = fullTime(msg.created_at); // 详情显示完整时间
            detailEl.appendChild(card);

            // 操作栏：编辑 / 删除 / 分享（编辑、删除仅站长可用；后端 403 兜底）
            const actions = document.createElement('div');
            actions.className = 'moment-actions';
            actions.innerHTML = `
        <button type="button" class="action-btn" data-act="edit"><i class="fas fa-edit"></i> 编辑</button>
        <button type="button" class="action-btn danger" data-act="del"><i class="fas fa-trash"></i> 删除</button>
        <button type="button" class="action-btn" data-act="share"><i class="fas fa-share-nodes"></i> 分享</button>`;
            detailEl.appendChild(actions);
            // 非站长：隐藏编辑/删除按钮
            fetch('/api/auth/me')
                .then((r) => (r.ok ? r.json() : null))
                .then((user) => {
                    if (!user?.is_admin) {
                        actions.querySelector('[data-act="edit"]').style.display = 'none';
                        actions.querySelector('[data-act="del"]').style.display = 'none';
                    }
                })
                .catch(() => {
                    actions.querySelector('[data-act="edit"]').style.display = 'none';
                    actions.querySelector('[data-act="del"]').style.display = 'none';
                });

            // ===== 编辑：正文替换为输入框，保存后 PUT =====
            actions.querySelector('[data-act="edit"]').addEventListener('click', () => {
                if (card.querySelector('.moment-edit-area')) return; // 已在编辑
                const contentP = card.querySelector('.moment-content');
                const area = document.createElement('div');
                area.className = 'moment-edit-area';
                area.innerHTML = `
          <textarea maxlength="1000"></textarea>
          <div class="edit-btns">
            <button type="button" class="edit-cancel">取消</button>
            <button type="button" class="edit-save">保存</button>
          </div>`;
                const textarea = area.querySelector('textarea');
                textarea.value = msg.content;
                contentP.style.display = 'none';
                contentP.after(area);

                area.querySelector('.edit-cancel').addEventListener('click', () => {
                    area.remove();
                    contentP.style.display = '';
                });
                area.querySelector('.edit-save').addEventListener('click', async () => {
                    const content = textarea.value.trim();
                    if (!content) { alert('内容不能为空'); return; }
                    const saveBtn = area.querySelector('.edit-save');
                    saveBtn.disabled = true;
                    saveBtn.textContent = '保存中...';
                    try {
                        const res = await fetch(`/api/moments/${msg.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content, images: msg.images || [] }),
                        });
                        if (res.status === 401 || res.status === 403) {
                            const d = await res.json().catch(() => ({}));
                            throw new Error(d.detail || '无权限');
                        }
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        msg.content = content;
                        contentP.textContent = content;
                        area.remove();
                        contentP.style.display = '';
                        showToast('说说已更新');
                    } catch (err) {
                        alert(`保存失败：${err.message}`);
                        saveBtn.disabled = false;
                        saveBtn.textContent = '保存';
                    }
                });
            });

            // ===== 删除：确认后 DELETE，回到列表 =====
            actions.querySelector('[data-act="del"]').addEventListener('click', async () => {
                if (!confirm('确定删除这条说说吗？评论也会一并删除。')) return;
                try {
                    const res = await fetch(`/api/moments/${msg.id}`, { method: 'DELETE' });
                    if (res.status === 401 || res.status === 403) {
                        const d = await res.json().catch(() => ({}));
                        throw new Error(d.detail || '无权限');
                    }
                    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
                    showToast('说说已删除');
                    setTimeout(() => { location.href = '/pages/moments/'; }, 600);
                } catch (err) {
                    alert(`删除失败：${err.message}`);
                }
            });

            // ===== 分享：复制当前详情页链接 =====
            actions.querySelector('[data-act="share"]').addEventListener('click', async () => {
                const url = location.href;
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(url);
                    } else {
                        // 非安全上下文（如 http）的降级方案
                        const tmp = document.createElement('textarea');
                        tmp.value = url;
                        document.body.appendChild(tmp);
                        tmp.select();
                        document.execCommand('copy');
                        tmp.remove();
                    }
                    showToast('链接已复制，快去分享吧');
                } catch {
                    showToast(`复制失败，请手动复制：${url}`);
                }
            });

            const back = document.createElement('p');
            back.className = 'moment-back';
            back.innerHTML = '<a href="./index.html"><i class="fas fa-angle-left"></i> 返回说说</a>';
            detailEl.appendChild(back);
        })
        .catch((err) => {
            detailEl.innerHTML = `<p class="moment-empty">加载失败：${err.message}（后端启动了吗？）</p>`;
        });
}

// ===== 评论（详情页） =====
export function initMomentComments() {
    const listEl = document.getElementById('comment-list');
    const form = document.getElementById('comment-form');
    if (!listEl || !form) return;

    const countEl = document.getElementById('comment-count');
    const nameInput = document.getElementById('comment-name');
    const contentInput = document.getElementById('comment-content');

    // 从 URL 拿说说 ID；无效则隐藏整个评论区
    const id = new URLSearchParams(location.search).get('id');
    if (!id || !/^\d+$/.test(id)) {
        form.closest('.moment-comment-section').style.display = 'none';
        return;
    }

    // ===== 登录态适配：评论需登录 =====
    let loggedIn = false;
    fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((user) => {
            loggedIn = !!user;
            if (loggedIn) {
                // 已登录：昵称自动使用用户名，隐藏昵称输入框
                nameInput.style.display = 'none';
                nameInput.value = user.username;
            } else {
                // 未登录：隐藏表单，显示登录引导
                form.style.display = 'none';
                const tip = document.createElement('p');
                tip.className = 'comment-login-tip';
                tip.innerHTML = '登录后才能评论，<a href="#" id="goto-login">去登录 <i class="fas fa-angle-right"></i></a>';
                form.before(tip);
                tip.querySelector('#goto-login').addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelector('.user-btn')?.click(); // 打开登录模态框
                });
            }
        })
        .catch(() => {});

    function renderComment(c) {
        return createCommentElement(c, {
            likeType: 'moment_comment',
            replyUrl: `/api/moments/${id}/comments`,
            onReload: loadComments,
        });
    }

    async function loadComments() {
        try {
            const res = await fetch(`/api/moments/${id}/comments`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (countEl) countEl.textContent = `（${data.total}）`;
            listEl.innerHTML = '';
            if (!data.total) {
                listEl.innerHTML = '<p class="comment-empty">还没有评论，来说两句吧～</p>';
                return;
            }
            data.items.forEach((c) => listEl.appendChild(renderComment(c)));
        } catch (err) {
            listEl.innerHTML = `<p class="comment-empty">评论加载失败：${err.message}</p>`;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!loggedIn) {
            alert('请先登录后再评论');
            return;
        }
        const content = contentInput.value.trim();
        if (!content) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '发表中...';
        try {
            const res = await fetch(`/api/moments/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }), // 昵称由后端取当前登录用户名
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            contentInput.value = '';
            await loadComments();
        } catch (err) {
            alert(`评论发表失败：${err.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '发表评论';
        }
    });

    loadComments();
}

// ===== 发布页 =====
export function initMomentForm() {
    const form = document.getElementById('moment-form');
    if (!form) return;

    const contentInput = document.getElementById('moment-content');
    const countEl = document.getElementById('char-count');
    const fileInput = document.getElementById('moment-images-input');
    const previewsEl = document.getElementById('moment-previews');
    const MAX_IMAGES = 9;
    const MAX_CHARS = 1000;
    // 已上传图片的 URL（点 × 删除时不回收磁盘文件，后续做存储清理）
    const uploadedUrls = [];

    // ===== 站长门控：说说仅站长可发布，非站长隐藏表单并提示 =====
    fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((user) => {
            if (user?.is_admin) return;
            form.style.display = 'none';
            const notice = document.createElement('p');
            notice.className = 'moment-empty';
            notice.textContent = user
                ? '仅站长可发布说说。'
                : '发布说说需要先登录站长账号（点击右上角头像登录）。';
            form.before(notice);
        })
        .catch(() => {});

    // 字数统计
    function updateCount() {
        const len = contentInput.value.length;
        countEl.textContent = `${len} / ${MAX_CHARS}`;
        countEl.classList.toggle('over', len > MAX_CHARS);
    }
    contentInput.addEventListener('input', updateCount);
    updateCount();

    // 选图 → 立即上传，预览缩略图
    fileInput.addEventListener('change', async () => {
        const files = [...fileInput.files];
        fileInput.value = '';
        for (const file of files) {
            if (uploadedUrls.length >= MAX_IMAGES) {
                alert(`最多上传 ${MAX_IMAGES} 张图片`);
                break;
            }
            if (!file.type.startsWith('image/')) continue;

            const preview = document.createElement('div');
            preview.className = 'moment-preview uploading';
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = '上传预览';
            preview.appendChild(img);
            previewsEl.appendChild(preview);

            try {
                const fd = new FormData();
                fd.append('file', file);
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `HTTP ${res.status}`);
                const { url } = await res.json();
                uploadedUrls.push(url);

                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'remove';
                remove.textContent = '×';
                remove.addEventListener('click', () => {
                    uploadedUrls.splice(uploadedUrls.indexOf(url), 1);
                    preview.remove();
                });
                preview.appendChild(remove);
                preview.classList.remove('uploading');
            } catch (err) {
                preview.remove();
                alert(`图片上传失败：${err.message}`);
            }
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = contentInput.value.trim();
        if (!content) return;
        if (content.length > MAX_CHARS) {
            alert(`内容超过 ${MAX_CHARS} 字`);
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '发布中...';
        try {
            const res = await fetch('/api/moments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, images: uploadedUrls }),
            });
            if (res.status === 401) {
                alert('请先登录后再发布（点击右上角头像登录）');
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // 发布成功回到说说列表查看
            const { id } = await res.json();
            location.href = `/pages/moments/detail.html?id=${id}`;
        } catch (err) {
            alert(`发布失败：${err.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = '发布';
        }
    });
}
