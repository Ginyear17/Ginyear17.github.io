// 说说页入口：公共布局 + 说说列表 / 详情 / 评论 / 发布
// 四个页面共用一个入口，按各页面元素存在与否自动生效
import { initMain } from '../main.js'
import { initMomentComments, initMomentDetail, initMomentForm, initMoments } from '../moments.js'

initMain()
initMoments()
initMomentDetail()
initMomentComments()
initMomentForm()
