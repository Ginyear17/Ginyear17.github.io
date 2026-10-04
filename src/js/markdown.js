// Markdown 渲染：发布页实时预览与详情页正文共用
// marked 解析 → DOMPurify 消毒（防 XSS）→ highlight.js 代码高亮（按需手动调用）
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'

marked.setOptions({
    gfm: true, // 表格 / 删除线 / 任务列表
    breaks: true, // 单个换行转 <br>（中文写作习惯）
})

/** Markdown → 消毒后的安全 HTML */
export function renderMarkdown(text) {
    const raw = marked.parse(text ?? '')
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] })
}

/** 对容器内的代码块做语法高亮（插入 DOM 后调用） */
export function highlightCode(container) {
    container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
    })
}
