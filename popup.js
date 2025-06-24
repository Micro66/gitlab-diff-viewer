// 弹出窗口逻辑
document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('status');
  const configBtn = document.getElementById('configBtn');
  const helpBtn = document.getElementById('helpBtn');

  // 检查配置状态
  await checkConfigStatus();

  // 打开配置页面
  configBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 显示使用说明
  helpBtn.addEventListener('click', () => {
    const helpText = `
📋 使用说明：

1. 首先点击"打开配置页面"设置 GitLab Token
2. 访问任意 GitLab MR 页面
3. 页面右上角会出现浮动按钮组：
   • 🔍 查看 MR Diff - 查看完整差异
   • 🔧 测试 Token - 验证Token有效性
   • 🔄 重置 Token - 重新设置Token

🔑 Token 获取方法：
1. 登录 GitLab → Settings → Access Tokens
2. 创建新Token，勾选 'read_api' 权限
3. 复制生成的Token到配置页面

⚠️ 注意事项：
• Token 需要 read_api 权限
• 仅支持有访问权限的项目
• Token 安全存储在本地
    `;
    alert(helpText);
  });

  // 检查配置状态
  async function checkConfigStatus() {
    try {
      const result = await chrome.storage.sync.get(['gitlab_url', 'gitlab_token']);
      
      if (result.gitlab_token && result.gitlab_url) {
        status.textContent = '✅ 配置已完成';
        status.className = 'status configured';
      } else {
        status.textContent = '❌ 需要配置 Token';
        status.className = 'status not-configured';
      }
    } catch (error) {
      console.error('检查配置状态失败:', error);
      status.textContent = '❓ 配置状态未知';
      status.className = 'status not-configured';
    }
  }
});