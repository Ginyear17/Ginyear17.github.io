// 登录模态框交互（后端尚未接入，目前仅演示，提交结果打印到控制台）
import { avatarUrl } from './components/layout.js'

// TODO: 接入后端后，改为根据真实登录态渲染用户信息
function updateUserInterface() {
  const userIcon = document.getElementById('user-icon');
  const avatar = document.getElementById('user-avatar');
  if (userIcon) userIcon.style.display = 'none';
  if (avatar) {
    avatar.src = avatarUrl;
    avatar.style.display = 'inline-block';
  }
}

export function initModal() {
  // 获取模态框元素
  const modal = document.getElementById('login-modal');
  if (!modal) return;

  // 获取打开/关闭模态框的按钮
  const userBtn = document.querySelector('.user-btn');
  const closeButton = modal.querySelector('.close-button');

  // 当用户点击用户按钮时,打开模态框
  userBtn?.addEventListener('click', function () {
    modal.style.display = 'flex';
  });

  // 当用户点击关闭按钮时,关闭模态框
  closeButton?.addEventListener('click', function () {
    modal.style.display = 'none';
  });

  // 处理登录表单提交
  const form = document.getElementById('login-form');
  form?.addEventListener('submit', function (event) {
    event.preventDefault();
    // 在这里添加登录逻辑
    console.log('用户名:', document.getElementById('username').value);
    console.log('密码:', document.getElementById('password').value);
    // 登录成功后,关闭模态框并更新用户界面
    modal.style.display = 'none';
    updateUserInterface();
  });
}