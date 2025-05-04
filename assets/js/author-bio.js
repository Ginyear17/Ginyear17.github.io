document.addEventListener('DOMContentLoaded', function() {
    const baseUrl = window.baseUrl || '';
    // 创建一个包含多个个性签名的数组
    const signatures = [
        "我们共有过一整个溽夏的波长<br>却在立秋的节点失焦成噪点",
        "人生若只如初见<br>何事秋风悲画扇",
        "我想我会一直记得那夜里<br>与你一同走过的那条雨路",
        "自两人相爱时起<br>便永远相互改变了对方",
        "愿没有盛夏没有剩下<br>记忆不要蒙尘",
        "我们无法预知某个瞬间的价值<br>直到它们成为回忆",
        "我们短暂交错，尾声潮落<br>致敬这场遇见",
        "落日沉溺于橘色的海<br>晚风沦陷于赤诚的爱",
        "秋意已暮<br>新冬将至",
    ];

    // 随机选择一个签名
    const randomIndex = Math.floor(Math.random() * signatures.length);
    
    // 获取元素并设置内容
    const bio = document.querySelector('.author-bio') || document.getElementById('author-bio');
    bio.innerHTML = signatures[randomIndex];
});