// 博客详情页入口：公共布局 + 按 ?id= 渲染文章正文 + 评论区
import { initMain } from '../main.js'
import { initBlogComments, initBlogDetail } from '../blog.js'

initMain()
initBlogDetail()
initBlogComments()
