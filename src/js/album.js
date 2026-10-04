// 相册：接入 /api/albums（列表/详情/新建/添加照片）
// 灯箱复用说说模块的 openLightbox（已含缩放手势）
import { openLightbox } from './moments.js'

export function initAlbum() {
    const gridEl = document.getElementById('album-grid');
    if (!gridEl) return;

    const toolbarEl = document.getElementById('album-toolbar');
    const detailEl = document.getElementById('album-detail');
    const photoGridEl = document.getElementById('photo-grid');
    const detailTitleEl = document.getElementById('album-detail-title');
    const detailDescEl = document.getElementById('album-detail-desc');
    const detailActionsEl = document.getElementById('album-detail-actions');

    let currentUser = null;
    let currentAlbum = null; // 当前打开的相册

    // me 查询存为 promise：openAlbum 前等待它完成，避免登录态未就绪导致按钮缺失
    const meReady = fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((user) => {
            currentUser = user;
            renderToolbar();
            return user;
        })
        .catch(() => null);

    // ===== 工具栏：新建相册（登录后显示） =====
    function renderToolbar() {
        if (!toolbarEl) return;
        if (!currentUser) {
            toolbarEl.innerHTML = '<p class="album-hint">登录后可以创建自己的相册</p>';
            return;
        }
        toolbarEl.innerHTML = `
      <button type="button" class="album-new-btn" id="album-new-btn">
        <i class="fas fa-plus"></i> 新建相册
      </button>
      <div class="album-new-form" id="album-new-form" style="display: none;">
        <input type="text" id="album-title-input" placeholder="相册名称（必填）" maxlength="50">
        <input type="text" id="album-desc-input" placeholder="描述（选填）" maxlength="200">
        <button type="button" id="album-create-btn">创建</button>
      </div>`;
        document.getElementById('album-new-btn')?.addEventListener('click', () => {
            const f = document.getElementById('album-new-form');
            f.style.display = f.style.display === 'none' ? 'flex' : 'none';
        });
        document.getElementById('album-create-btn')?.addEventListener('click', async () => {
            const title = document.getElementById('album-title-input').value.trim();
            if (!title) { alert('请填写相册名称'); return; }
            try {
                const res = await fetch('/api/albums', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        description: document.getElementById('album-desc-input').value.trim(),
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
                await loadAlbums();
                document.getElementById('album-new-form').style.display = 'none';
            } catch (err) {
                alert(`创建失败：${err.message}`);
            }
        });
    }

    // ===== 相册列表 =====
    async function loadAlbums() {
        gridEl.innerHTML = '<p class="album-loading">加载中...</p>';
        try {
            const res = await fetch('/api/albums?limit=50');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            gridEl.innerHTML = '';
            if (!data.total) {
                gridEl.innerHTML = '<p class="album-empty">还没有相册，发布带图说说或新建一个吧～</p>';
                return;
            }
            data.items.forEach((a) => gridEl.appendChild(renderAlbumCard(a)));
        } catch (err) {
            gridEl.innerHTML = `<p class="album-empty">相册加载失败：${err.message}（后端启动了吗？）</p>`;
        }
    }

    function renderAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
      <div class="album-cover">
        ${album.cover
                ? `<img src="${album.cover}" alt="${album.title} 封面" loading="lazy">`
                : '<i class="fas fa-images album-cover-placeholder"></i>'}
        ${album.is_system ? '<span class="album-badge">自动归档</span>' : ''}
      </div>
      <div class="album-card-info">
        <p class="album-title"></p>
        <p class="album-meta"><i class="fas fa-photo-film"></i> ${album.photo_count} 张 · ${album.username}</p>
      </div>`;
        card.querySelector('.album-title').textContent = album.title;
        card.addEventListener('click', () => openAlbum(album.id));
        return card;
    }

    // ===== 相册详情：照片墙 =====
    async function openAlbum(albumId) {
        await meReady; // 等登录态就绪再渲染操作按钮
        try {
            const res = await fetch(`/api/albums?limit=50`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            currentAlbum = data.items.find((a) => a.id === albumId);
            if (!currentAlbum) throw new Error('相册不存在');
        } catch (err) {
            alert(`相册信息加载失败：${err.message}`);
            return;
        }

        // 头部信息 + 操作（仅创建者）
        detailTitleEl.textContent = currentAlbum.title;
        detailDescEl.textContent = currentAlbum.description || '';
        detailActionsEl.innerHTML = '';
        if (currentUser && currentUser.id === currentAlbum.user_id) {
            if (!currentAlbum.is_system) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'album-action danger';
                delBtn.innerHTML = '<i class="fas fa-trash"></i> 删除相册';
                delBtn.addEventListener('click', deleteAlbum);
                detailActionsEl.appendChild(delBtn);
            }
            const addLabel = document.createElement('label');
            addLabel.className = 'album-action';
            addLabel.innerHTML = '<i class="fas fa-plus"></i> 添加照片<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple hidden>';
            addLabel.querySelector('input').addEventListener('change', uploadPhotos);
            detailActionsEl.appendChild(addLabel);
        }

        // 加载照片
        photoGridEl.innerHTML = '<p class="album-loading">加载中...</p>';
        try {
            const res = await fetch(`/api/albums/${albumId}/photos`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            photoGridEl.innerHTML = '';
            if (!data.total) {
                photoGridEl.innerHTML = '<p class="album-empty">这个相册还没有照片～</p>';
            } else {
                data.items.forEach((p, i) => photoGridEl.appendChild(renderPhoto(p, data.items.map((x) => x.url), i)));
            }
        } catch (err) {
            photoGridEl.innerHTML = `<p class="album-empty">照片加载失败：${err.message}</p>`;
        }

        document.getElementById('album-grid').style.display = 'none';
        toolbarEl.style.display = 'none';
        detailEl.style.display = '';
    }

    function renderPhoto(photo, urls, index) {
        const cell = document.createElement('div');
        cell.className = 'photo-cell';
        cell.innerHTML = `
      <img src="${photo.url}" alt="照片" loading="lazy">
      <span class="photo-source" title="来源">${photo.source === 'moment' ? '说说' : photo.source === 'blog' ? '博客' : '上传'}</span>`;
        cell.querySelector('img').addEventListener('click', () => openLightbox(urls, index));
        return cell;
    }

    function backToList() {
        detailEl.style.display = 'none';
        document.getElementById('album-grid').style.display = '';
        toolbarEl.style.display = '';
        currentAlbum = null;
        loadAlbums();
    }
    document.getElementById('album-back')?.addEventListener('click', backToList);

    // ===== 添加照片：多选上传 → 归档进当前相册 =====
    async function uploadPhotos(e) {
        const files = [...e.target.files];
        e.target.value = '';
        if (!files.length || !currentAlbum) return;
        photoGridEl.insertAdjacentHTML('afterbegin', '<p class="album-loading" id="album-uploading">上传中...</p>');
        const urls = [];
        try {
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                const fd = new FormData();
                fd.append('file', file);
                const up = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!up.ok) throw new Error(`上传失败：HTTP ${up.status}`);
                urls.push((await up.json()).url);
            }
            const res = await fetch(`/api/albums/${currentAlbum.id}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await openAlbum(currentAlbum.id); // 重新加载照片墙
        } catch (err) {
            document.getElementById('album-uploading')?.remove();
            alert(`添加照片失败：${err.message}`);
        }
    }

    // ===== 删除相册 =====
    async function deleteAlbum() {
        if (!currentAlbum) return;
        if (!confirm(`确定删除相册「${currentAlbum.title}」吗？其中的照片记录会一并删除。`)) return;
        try {
            const res = await fetch(`/api/albums/${currentAlbum.id}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
            backToList();
        } catch (err) {
            alert(`删除失败：${err.message}`);
        }
    }

    loadAlbums();
}
