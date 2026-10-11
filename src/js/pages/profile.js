// 个人中心页面：账号概览 / 基础资料 / 头像 / 邮箱 / 密码 / 退出登录
// 后端接口见 backend/app/routers/auth.py
import { initMain } from '../main.js'
import { avatarUrl } from '../components/layout.js'

initMain()

const $ = (id) => document.getElementById(id)

const DEFAULT_AVATAR = avatarUrl
let currentUser = null
let emailCountdown = null

// ===== 工具 =====
function showMsg(el, text, isError = true) {
    el.textContent = text
    el.className = 'profile-form-msg' + (isError ? ' error' : ' ok')
}

function clearMsg(el) {
    el.textContent = ''
    el.className = 'profile-form-msg'
}

function formatDate(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d)) return '—'
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ===== 登录态渲染 =====
function render(user) {
    currentUser = user
    $('profile-unauth').hidden = true
    $('profile-content').hidden = false

    $('profile-avatar').src = user.avatar || DEFAULT_AVATAR
    $('profile-username-display').textContent = user.username
    $('profile-username').value = user.username
    $('profile-email-display').textContent = `邮箱：${user.email || '—'}`
    $('profile-created-display').textContent = `注册于 ${formatDate(user.created_at)}`
    const badge = $('profile-role-badge')
    badge.textContent = user.is_admin ? '站长' : '成员'
    badge.classList.toggle('admin', !!user.is_admin)
    $('profile-bio').value = user.bio || ''
    $('profile-website').value = user.website || ''
    $('profile-location').value = user.location || ''
}

async function loadMe() {
    const showUnauth = () => {
        $('profile-content').hidden = true
        $('profile-unauth').hidden = false
    }
    try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const user = await res.json()
        if (user) render(user)
        else showUnauth()
    } catch {
        showUnauth()
    }
}

// 保存基础资料（表单提交 / 头像上传共用）
async function saveProfile() {
    const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: $('profile-username').value.trim(),
            bio: $('profile-bio').value.trim(),
            website: $('profile-website').value.trim(),
            location: $('profile-location').value.trim(),
            avatar: currentUser.avatar || null,
        }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
    render(data)
    return data
}

// ===== 事件绑定 =====
// 未登录 → 打开登录模态框
$('profile-login-btn')?.addEventListener('click', () => {
    document.querySelector('.user-btn')?.click()
})

// 基础资料
$('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const msg = $('profile-form-msg')
    clearMsg(msg)
    const btn = e.target.querySelector('button[type="submit"]')
    btn.disabled = true
    try {
        await saveProfile()
        showMsg(msg, '资料保存成功', false)
    } catch (err) {
        showMsg(msg, `保存失败：${err.message}`)
    } finally {
        btn.disabled = false
    }
})

// 头像上传：POST /api/auth/avatar → 保存到资料
$('avatar-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const msg = $('profile-form-msg')
    clearMsg(msg)
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showMsg(msg, '仅支持 jpg/png/gif/webp 图片')
        return
    }
    if (file.size > 2 * 1024 * 1024) {
        showMsg(msg, '头像图片不能超过 2MB')
        return
    }
    const fd = new FormData()
    fd.append('file', file)
    try {
        const res = await fetch('/api/auth/avatar', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
        currentUser.avatar = data.url
        $('profile-avatar').src = data.url
        await saveProfile() // 上传后立即持久化头像 URL
        showMsg(msg, '头像已更新', false)
    } catch (err) {
        showMsg(msg, `头像上传失败：${err.message}`)
    }
})

// 改邮箱：发送验证码（60 秒倒计时）
$('email-send-code')?.addEventListener('click', async () => {
    const email = $('profile-new-email').value.trim()
    const msg = $('email-form-msg')
    clearMsg(msg)
    if (!email) {
        showMsg(msg, '请先填写新邮箱')
        return
    }
    const btn = $('email-send-code')
    btn.disabled = true
    try {
        const res = await fetch('/api/auth/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
        // 开发模式（SMTP_DEV_MODE=true）后端直接返回验证码，方便联调
        showMsg(msg, data.dev_code
            ? `验证码已发送（开发模式验证码：${data.dev_code}）`
            : '验证码已发送，请查收邮箱（10 分钟内有效）', false)
        let left = 60
        const tick = () => {
            btn.textContent = `${left}s 后重发`
            if (--left < 0) {
                clearInterval(emailCountdown)
                btn.textContent = '发送验证码'
                btn.disabled = false
            }
        }
        tick()
        emailCountdown = setInterval(tick, 1000)
    } catch (err) {
        btn.disabled = false
        showMsg(msg, `发送失败：${err.message}`)
    }
})

// 改邮箱：提交
$('email-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const msg = $('email-form-msg')
    clearMsg(msg)
    const btn = e.target.querySelector('button[type="submit"]')
    btn.disabled = true
    try {
        const res = await fetch('/api/auth/change-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: $('profile-new-email').value.trim(),
                code: $('profile-email-code').value.trim(),
            }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
        showMsg(msg, '邮箱修改成功', false)
        e.target.reset()
        render(data)
    } catch (err) {
        showMsg(msg, `修改失败：${err.message}`)
    } finally {
        btn.disabled = false
    }
})

// 改密码
$('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const msg = $('password-form-msg')
    clearMsg(msg)
    const pwd = $('profile-new-password').value
    if (pwd !== $('profile-confirm-password').value) {
        showMsg(msg, '两次输入的新密码不一致')
        return
    }
    const btn = e.target.querySelector('button[type="submit"]')
    btn.disabled = true
    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                old_password: $('profile-old-password').value,
                new_password: pwd,
            }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.detail || `HTTP ${res.status}`)
        }
        showMsg(msg, '密码修改成功', false)
        e.target.reset()
    } catch (err) {
        showMsg(msg, `修改失败：${err.message}`)
    } finally {
        btn.disabled = false
    }
})

// 退出登录
$('profile-logout-btn')?.addEventListener('click', async () => {
    try {
        await fetch('/api/auth/logout', { method: 'POST' })
    } catch { /* 忽略 */ }
    location.reload() // 刷新后回到未登录引导
})

loadMe()
