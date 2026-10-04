// 留言板：接入 FastAPI 后端 /api/messages（开发时经 Vite 代理转发）
// 留言需登录：左上角显示用户名，署名选填显示在留言右下角的“——署名”
export function initBoard() {
    const listEl = document.getElementById('message-list');
    const form = document.getElementById('message-form');
    const signatureInput = document.getElementById('msg-signature');
    const contentInput = document.getElementById('msg-content');
    const totalEl = document.getElementById('message-total');
    if (!listEl || !form) return;

    // ===== 登录态适配：留言需登录 =====
    let loggedIn = false;
    fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((user) => {
            loggedIn = !!user;
            if (!loggedIn) {
                form.style.display = 'none';
                const tip = document.createElement('p');
                tip.className = 'message-login-tip';
                tip.innerHTML = '登录后才能留言，<a href="#" id="goto-login">去登录 <i class="fas fa-angle-right"></i></a>';
                form.before(tip);
                tip.querySelector('#goto-login').addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelector('.user-btn')?.click(); // 打开登录模态框
                });
            }
        })
        .catch(() => {});

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
      <p class="message-content"></p>
      <p class="message-signature" style="display: none;"></p>`;
        div.querySelector('.message-name').textContent = msg.name;
        div.querySelector('.message-time').textContent = formatTime(msg.created_at);
        div.querySelector('.message-content').textContent = msg.content;
        // 署名选填：填了才显示在右下角
        if (msg.signature) {
            const sig = div.querySelector('.message-signature');
            sig.style.display = '';
            sig.textContent = `—— ${msg.signature}`;
        }
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
        if (!loggedIn) {
            alert('请先登录后再留言');
            return;
        }
        const content = contentInput.value.trim();
        if (!content) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature: signatureInput.value.trim() || null, // 署名选填
                    content,
                }),
            });
            if (res.status === 401) {
                alert('请先登录后再留言');
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            contentInput.value = '';
            signatureInput.value = '';
            await loadMessages();
        } catch (err) {
            alert(`留言发布失败：${err.message}`);
        } finally {
            submitBtn.disabled = false;
        }
    });

    loadMessages();
}
