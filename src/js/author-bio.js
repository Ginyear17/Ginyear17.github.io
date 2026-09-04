// 作者卡片：每次刷新随机显示一条个性签名
export function initAuthorBio() {
    // 创建一个包含多个个性签名的数组
    const signatures = [
        "人生若只如初见<br>何事秋风悲画扇",
        "我想我会一直记得那天夜里<br>与你一同走过的那条雨路",
        "自两人相爱时起<br>便永远相互改变了对方",
        "愿没有盛夏没有剩下<br>记忆不要蒙尘",
        "我们无法预知某个瞬间的价值<br>直到它们成为回忆",
        "落日沉溺于橘色的海<br>晚风沦陷于赤诚的爱",
    ];

    // 随机选择一个签名
    const randomIndex = Math.floor(Math.random() * signatures.length);

    // 获取元素并设置内容
    const bio = document.querySelector('.author-bio') || document.getElementById('author-bio');
    if (bio) bio.innerHTML = signatures[randomIndex];
}