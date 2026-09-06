// 留言板：接入 FastAPI 后端 /api/messages（开发时经 Vite 代理转发）
export function initBoard() {
    const listEl = document.getElementById('message-list');
    const form = document.getElementById('message-form');
    const nameInput = document.getElementById('msg-name');
    const contentInput = document.getElementById('msg-content');
    const totalEl = document.getElementById('message-total');
    if (!listEl || !form) return;

    function formatTime(iso) {
        const d = new Date(iso);
        return isNaN(d) ? String(iso) : d.toLocaleString('zh-CN');
    }

    function renderMessage(msg) {
        // 用 textContent 填充内容，天然防 XSS
        const div = document.createElement('div');
        div.className = 'message-item';
        div.innerHTML = `
      <div class="message-header">
        <span class="message-name"></span>
        <span class="message-time"></span>
      </div>
      <p class="message-content"></p>`;
        div.querySelector('.message-name').textContent = msg.name;
        div.querySelector('.message-time').textContent = formatTime(msg.created_at);
        div.querySelector('.message-content').textContent = msg.content;
        return div;
    }

    async function loadMessages() {
        try {
            const res = await fetch('/api/messages?limit=50');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (totalEl) totalEl.textContent = `共 ${data.total} 条留言`;
            listEl.innerHTML = '';
            if (!data.items.length) {
                listEl.innerHTML = '<p class="message-empty">还没有留言，来抢沙发吧～</p>';
                return;
            }
            data.items.forEach((msg) => listEl.appendChild(renderMessage(msg)));
        } catch (err) {
            listEl.innerHTML = `<p class="message-empty">留言加载失败：${err.message}（后端启动了吗？）</p>`;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = contentInput.value.trim();
        if (!content) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.value.trim() || '匿名', content }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            contentInput.value = '';
            await loadMessages();
        } catch (err) {
            alert(`留言发布失败：${err.message}`);
        } finally {
            submitBtn.disabled = false;
        }
    });

    loadMessages();
}
