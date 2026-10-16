// 登录 / 注册模态框：接入后端 /api/auth（会话 Cookie 方案）
import { avatarUrl } from './components/layout.js'

export function initModal() {
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    if (!loginModal || !registerModal) return;

    const loginView = document.getElementById('login-view');
    const profileView = document.getElementById('profile-view');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error-msg');
    const loginCodeForm = document.getElementById('login-code-form');
    const loginCodeError = document.getElementById('login-code-error-msg');
    const loginSendCodeBtn = document.getElementById('login-send-code-btn');
    const registerForm = document.getElementById('register-form');
    const registerError = document.getElementById('register-error-msg');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const userIcon = document.getElementById('user-icon');
    const avatar = document.getElementById('user-avatar');

    let currentUser = null;
    let countdownTimer = null;

    // 发送验证码后的 60 秒倒计时（注册 / 验证码登录共用）
    const startCountdown = (btn) => {
        if (countdownTimer) clearInterval(countdownTimer);
        let left = 60;
        const tick = () => {
            btn.textContent = `${left}s 后重发`;
            if (--left < 0) {
                clearInterval(countdownTimer);
                btn.textContent = '发送验证码';
                btn.disabled = false;
            }
        };
        tick();
        countdownTimer = setInterval(tick, 1000);
    };

    // 模态框需要 flex 居中；视图容器用 block（flex 会把 h2 压成竖排）
    const showModal = (el) => { el.style.display = 'flex'; };
    const hideModal = (el) => { el.style.display = 'none'; };
    const showView = (el) => { el.style.display = 'block'; };
    const hideView = (el) => { el.style.display = 'none'; };

    // ===== 登录态渲染 =====
    function refreshUI() {
        if (currentUser) {
            avatar.src = currentUser.avatar || avatarUrl;
            avatar.style.display = 'inline-block';
            if (userIcon) userIcon.style.display = 'none';
            document.getElementById('profile-username-text').textContent = currentUser.username;
            showView(profileView);
            hideView(loginView);
        } else {
            avatar.style.display = 'none';
            if (userIcon) userIcon.style.display = 'inline-block';
            showView(loginView);
            hideView(profileView);
        }
    }

    // 页面加载即查询登录态（未登录返回 null，无报错）
    fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((user) => { currentUser = user; refreshUI(); })
        .catch(() => { });

    // ===== 打开 / 关闭 =====
    document.querySelector('.user-btn')?.addEventListener('click', () => {
        hideModal(registerModal);
        refreshUI(); // 根据登录态显示登录表单或个人信息
        showModal(loginModal);
    });

    document.querySelectorAll('#login-modal .close-button, #register-modal .close-button').forEach(
        (btn) => btn.addEventListener('click', () => { hideModal(loginModal); hideModal(registerModal); })
    );

    // ===== 登录 ⇄ 注册切换 =====
    document.querySelectorAll('.login-register-btn').forEach((btn) =>
        btn.addEventListener('click', () => {
            hideModal(loginModal);
            registerError.textContent = '';
            showModal(registerModal);
        })
    );
    document.getElementById('back-to-login-btn')?.addEventListener('click', () => {
        hideModal(registerModal);
        showModal(loginModal);
    });

    // ===== 登录方式切换：密码登录 ⇄ 验证码登录 =====
    const loginMethods = { password: loginForm, code: loginCodeForm };
    document.querySelectorAll('.login-tab').forEach((tab) =>
        tab.addEventListener('click', () => {
            document.querySelectorAll('.login-tab').forEach((t) => t.classList.toggle('active', t === tab));
            Object.entries(loginMethods).forEach(([key, form]) => {
                if (form) form.style.display = key === tab.dataset.loginTab ? 'flex' : 'none';
            });
            loginError.textContent = '';
            if (loginCodeError) loginCodeError.textContent = '';
        })
    );

    // ===== 发送验证码（60 秒倒计时） =====
    sendCodeBtn?.addEventListener('click', async () => {
        const email = document.getElementById('new-email').value.trim();
        if (!email) { registerError.textContent = '请先填写邮箱'; return; }
        sendCodeBtn.disabled = true;
        try {
            const res = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            registerError.style.color = '';
            registerError.textContent = '验证码已发送，请查收邮箱（10 分钟内有效）';
            // 开发模式（SMTP_DEV_MODE=true）后端会直接返回验证码，方便联调
            if (data.dev_code) registerError.textContent += `，开发模式验证码：${data.dev_code}`;
            startCountdown(sendCodeBtn);
        } catch (err) {
            sendCodeBtn.disabled = false;
            registerError.textContent = `发送失败：${err.message}`;
        }
    });

    // ===== 注册 =====
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.textContent = '';
        const password = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;
        if (password !== confirm) {
            registerError.textContent = '两次输入的密码不一致';
            return;
        }
        const submitBtn = document.getElementById('register-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '注册中...';
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('new-username').value.trim(),
                    email: document.getElementById('new-email').value.trim(),
                    code: document.getElementById('verification-code').value.trim(),
                    password,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            currentUser = data;
            hideModal(registerModal);
            refreshUI();
            location.reload(); // 刷新以同步全站登录态
        } catch (err) {
            registerError.textContent = `注册失败：${err.message}`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '注册';
        }
    });

    // ===== 登录 =====
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('username').value.trim(),
                    password: document.getElementById('password').value,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            currentUser = data;
            hideModal(loginModal);
            refreshUI();
            location.reload();
        } catch (err) {
            loginError.textContent = `登录失败：${err.message}`;
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ===== 验证码登录：发送验证码 =====
    loginSendCodeBtn?.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value.trim();
        if (!email) { loginCodeError.textContent = '请先填写邮箱'; return; }
        loginSendCodeBtn.disabled = true;
        try {
            const res = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            loginCodeError.style.color = '#27ae60';
            loginCodeError.textContent = '验证码已发送，请查收邮箱（10 分钟内有效）';
            // 开发模式（SMTP_DEV_MODE=true）后端会直接返回验证码，方便联调
            if (data.dev_code) loginCodeError.textContent += `，开发模式验证码：${data.dev_code}`;
            startCountdown(loginSendCodeBtn);
        } catch (err) {
            loginSendCodeBtn.disabled = false;
            loginCodeError.style.color = '';
            loginCodeError.textContent = `发送失败：${err.message}`;
        }
    });

    // ===== 验证码登录：提交 =====
    loginCodeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginCodeError.style.color = '';
        loginCodeError.textContent = '';
        const submitBtn = loginCodeForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
            const res = await fetch('/api/auth/login-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('login-email').value.trim(),
                    code: document.getElementById('login-code').value.trim(),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            currentUser = data;
            hideModal(loginModal);
            refreshUI();
            location.reload();
        } catch (err) {
            loginCodeError.textContent = `登录失败：${err.message}`;
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ===== 进入个人中心 =====
    document.getElementById('profile-center-btn')?.addEventListener('click', () => {
        hideModal(loginModal);
        location.href = '/pages/profile/index.html';
    });

    // ===== 退出登录 =====
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch { /* 忽略 */ }
        currentUser = null;
        hideModal(loginModal);
        refreshUI();
        location.reload();
    });
}