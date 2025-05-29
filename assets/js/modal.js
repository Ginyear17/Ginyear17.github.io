// 获取模态框元素
var modal = document.getElementById("login-modal");

// 获取打开模态框的按钮
var userBtn = document.querySelector(".user-btn");

// 获取关闭模态框的按钮
var closeButton = document.getElementsByClassName("close-button")[0];

// 当用户点击用户按钮时,打开模态框
userBtn.addEventListener("click", function() {
  modal.style.display = "flex";
});

// 当用户点击关闭按钮时,关闭模态框
closeButton.addEventListener("click", function() {
  modal.style.display = "none";
});

// 当用户在模态框外点击时,关闭模态框
// window.addEventListener("click", function(event) {
//   if (event.target == modal) {
//     modal.style.display = "none";
//   }
// });

// 处理登录表单提交
var form = document.getElementById("login-form");
form.addEventListener("submit", function(event) {
  event.preventDefault();
  // 在这里添加登录逻辑
  console.log("用户名:", document.getElementById("username").value);
  console.log("密码:", document.getElementById("password").value);
  // 登录成功后,关闭模态框并更新用户界面
  modal.style.display = "none";
  updateUserInterface();
});