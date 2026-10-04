// 全站公共入口：注入公共布局 + 初始化共享交互
// 各页面入口（src/js/pages/*.js）调用 initMain()
import { headerHTML, sidebarHTML, footerHTML } from './components/layout.js'
import { initUI } from './ui.js'
import { initModal } from './modal.js'
import { initCalendar } from './calendar.js'
import { initMusicCard } from './music-card.js'
import { initAuthorBio } from './author-bio.js'

export function initMain() {
    // 1. 注入公共布局（替换 HTML 里的占位节点）
    document.getElementById('layout-header').outerHTML = headerHTML()
    document.getElementById('layout-sidebar').outerHTML = sidebarHTML()
    document.getElementById('layout-footer').outerHTML = footerHTML()

    // 2. 初始化依赖布局 DOM 的各模块
    initUI()
    initModal()
    initCalendar()
    initMusicCard()
    initAuthorBio()

    // 3. 页脚访问统计（后端实时数据）
    initSiteStats()
}

// 页脚访问量（PV）/ 访客量（UV）：读取后端 /api/stats/summary
// 每个浏览器会话上报一次访问，刷新页面不会重复计数
async function initSiteStats() {
    const pvEl = document.getElementById('footer-pv')
    const uvEl = document.getElementById('footer-uv')
    if (!pvEl || !uvEl) return

    // 访客 ID：每个浏览器持久唯一（localStorage），后端按它去重统计 UV
    let visitorId = localStorage.getItem('visitor_id')
    if (!visitorId) {
        visitorId = crypto.randomUUID()
        localStorage.setItem('visitor_id', visitorId)
    }

    try {
        // 每个浏览器会话只上报一次
        if (!sessionStorage.getItem('visit_recorded')) {
            sessionStorage.setItem('visit_recorded', '1')
            await fetch('/api/stats/visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitor_id: visitorId, path: location.pathname }),
            })
        }

        const res = await fetch('/api/stats/summary')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { pv, uv } = await res.json()
        pvEl.textContent = `访问量：${pv.toLocaleString()}`
        uvEl.textContent = `访客量：${uv.toLocaleString()}`
    } catch {
        // 后端不可用时保持占位 "--"，不影响页面其它功能
    }
}
