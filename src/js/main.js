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
}
