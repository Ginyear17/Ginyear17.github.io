// 全站 UI 交互：主题切换、移动端菜单、返回顶部、搜索/加载更多（占位）
// 所有选择器均做了空值保护，避免某元素不存在时中断后续初始化
export function initUI() {
  // 恢复上次保存的主题，避免闪烁
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }

  // Theme toggle
  const themeToggle = document.querySelector('.theme-toggle');
  const themeIcon = themeToggle?.querySelector('i');

  themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark');

    if (document.body.classList.contains('dark')) {
      themeIcon.className = 'fas fa-moon';
      localStorage.setItem('theme', 'dark');
    } else {
      themeIcon.className = 'fas fa-sun';
      localStorage.setItem('theme', 'light');
    }
  });

  // Mobile menu toggle
  const menuBtn = document.querySelector('.menu-btn');
  const closeMenuBtn = document.querySelector('.close-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.overlay');

  function closeMenu() {
    mobileMenu?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  menuBtn?.addEventListener('click', () => {
    mobileMenu?.classList.add('active');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  closeMenuBtn?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);

  // Back to top button
  const backToTopBtn = document.getElementById('backToTop');

  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      backToTopBtn.classList.toggle('visible', window.scrollY > 300);
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // Search functionality（未实现，占位）
  const searchBtn = document.querySelector('.search-btn');
  searchBtn?.addEventListener('click', () => {
    alert('搜索功能将在这里实现');
  });

  // Load more posts（未实现，占位）
  const loadMoreBtn = document.querySelector('.load-more');
  loadMoreBtn?.addEventListener('click', () => {
    alert('加载更多文章功能将在这里实现');
  });
}