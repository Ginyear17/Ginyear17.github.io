document.addEventListener('click', function(e) {
    // 创建爱心元素
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.innerHTML = '❤';
    
    // 设置位置在鼠标点击的地方
    heart.style.left = (e.clientX - 10) + 'px';
    heart.style.top = (e.clientY - 10) + 'px';
    
    // 添加到页面
    document.body.appendChild(heart);
    
    // 动画结束后移除元素
    heart.addEventListener('animationend', function() {
        heart.remove();
    });
});