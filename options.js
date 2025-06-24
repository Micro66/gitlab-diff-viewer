// 配置页面逻辑
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('configForm');
  const gitlabServerSelect = document.getElementById('gitlabServer');
  const gitlabUrlInput = document.getElementById('gitlabUrl');
  const customUrlGroup = document.getElementById('customUrlGroup');
  const accessTokenInput = document.getElementById('accessToken');
  const testBtn = document.getElementById('testBtn');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');

  // 初始化服务器选择下拉框
  initServerSelect();

  // 加载已保存的配置
  await loadConfig();

  // 服务器选择变化事件
  gitlabServerSelect.addEventListener('change', () => {
    const selectedOption = gitlabServerSelect.options[gitlabServerSelect.selectedIndex];
    const serverUrl = selectedOption.value;
    
    if (serverUrl === 'custom') {
      customUrlGroup.style.display = 'block';
      gitlabUrlInput.required = true;
    } else {
      customUrlGroup.style.display = 'none';
      gitlabUrlInput.required = false;
      gitlabUrlInput.value = serverUrl;
    }
  });

  // 保存配置
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveConfig();
  });

  // 测试连接
  testBtn.addEventListener('click', async () => {
    await testConnection();
  });

  // 清除配置
  clearBtn.addEventListener('click', async () => {
    if (confirm('确定要清除所有配置吗？')) {
      await clearConfig();
    }
  });

  // 初始化服务器选择下拉框
  function initServerSelect() {
    const config = window.GITLAB_CONFIG || {};
    const servers = config.GITLAB_SERVERS || [
      { name: '默认GitLab', url: 'https://gitlab.example.com', description: '默认GitLab服务器' }
    ];
    
    gitlabServerSelect.innerHTML = '';
    
    servers.forEach(server => {
      const option = document.createElement('option');
      option.value = server.url || 'custom';
      option.textContent = `${server.name} - ${server.description}`;
      gitlabServerSelect.appendChild(option);
    });
  }

  // 加载配置
  async function loadConfig() {
    try {
      const result = await chrome.storage.sync.get(['gitlab_url', 'gitlab_token']);
      const config = window.GITLAB_CONFIG || {};
      
      const savedUrl = result.gitlab_url || config.DEFAULT_GITLAB_URL || 'https://gitlab.example.com';
      accessTokenInput.value = result.gitlab_token || '';
      
      // 设置服务器选择
      let foundMatch = false;
      for (let i = 0; i < gitlabServerSelect.options.length; i++) {
        const option = gitlabServerSelect.options[i];
        if (option.value === savedUrl) {
          gitlabServerSelect.selectedIndex = i;
          gitlabUrlInput.value = savedUrl;
          foundMatch = true;
          break;
        }
      }
      
      // 如果没有找到匹配的预设服务器，选择自定义
      if (!foundMatch) {
        const customOption = Array.from(gitlabServerSelect.options).find(opt => opt.value === 'custom' || opt.value === '');
        if (customOption) {
          gitlabServerSelect.value = customOption.value;
          customUrlGroup.style.display = 'block';
          gitlabUrlInput.required = true;
          gitlabUrlInput.value = savedUrl;
        }
      }
      
      if (result.gitlab_token) {
        showStatus('✅ 已加载保存的配置', 'success');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      showStatus('❌ 加载配置失败: ' + error.message, 'error');
    }
  }

  // 保存配置
  async function saveConfig() {
    let gitlabUrl;
    const selectedServer = gitlabServerSelect.value;
    
    if (selectedServer === 'custom' || selectedServer === '') {
      gitlabUrl = gitlabUrlInput.value.trim();
    } else {
      gitlabUrl = selectedServer;
    }
    
    const accessToken = accessTokenInput.value.trim();

    if (!gitlabUrl || !accessToken) {
      showStatus('❌ 请填写完整的配置信息', 'error');
      return;
    }

    // 验证URL格式
    try {
      new URL(gitlabUrl);
    } catch {
      showStatus('❌ GitLab 服务器地址格式不正确', 'error');
      return;
    }

    // 验证Token格式
    if (accessToken.length < 20) {
      showStatus('⚠️ Token 长度可能不正确，GitLab Token 通常为20位以上', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({
        gitlab_url: gitlabUrl,
        gitlab_token: accessToken
      });

      // 同时保存到localStorage以兼容旧版本
      localStorage.setItem('gitlab_token', accessToken);
      localStorage.setItem('gitlab_url', gitlabUrl);

      showStatus('✅ 配置保存成功！', 'success');
    } catch (error) {
      console.error('保存配置失败:', error);
      showStatus('❌ 保存配置失败: ' + error.message, 'error');
    }
  }

  // 测试连接
  async function testConnection() {
    let gitlabUrl;
    const selectedServer = gitlabServerSelect.value;
    
    if (selectedServer === 'custom' || selectedServer === '') {
      gitlabUrl = gitlabUrlInput.value.trim();
    } else {
      gitlabUrl = selectedServer;
    }
    
    const accessToken = accessTokenInput.value.trim();

    if (!gitlabUrl || !accessToken) {
      showStatus('❌ 请先填写 GitLab 地址和 Token', 'error');
      return;
    }

    showStatus('🔄 正在测试连接...', 'success');
    testBtn.disabled = true;

    try {
      const apiUrl = `${gitlabUrl}/api/v4/user`;
      const response = await fetch(apiUrl, {
        headers: {
          'PRIVATE-TOKEN': accessToken
        }
      });

      if (response.ok) {
        const user = await response.json();
        showStatus(
          `✅ 连接成功！\n用户: ${user.name}\n用户名: ${user.username}\nID: ${user.id}`,
          'success'
        );
      } else {
        const errorText = await response.text();
        showStatus(
          `❌ 连接失败\nHTTP ${response.status}: ${response.statusText}\n${errorText}`,
          'error'
        );
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      showStatus('❌ 测试连接失败: ' + error.message, 'error');
    } finally {
      testBtn.disabled = false;
    }
  }

  // 清除配置
  async function clearConfig() {
    try {
      await chrome.storage.sync.clear();
      localStorage.removeItem('gitlab_token');
      localStorage.removeItem('gitlab_url');
      
      gitlabUrlInput.value = 'https://gitlab.example.com';
      accessTokenInput.value = '';
      
      showStatus('✅ 配置已清除', 'success');
    } catch (error) {
      console.error('清除配置失败:', error);
      showStatus('❌ 清除配置失败: ' + error.message, 'error');
    }
  }

  // 显示状态信息
  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    // 3秒后自动隐藏成功消息
    if (type === 'success') {
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    }
  }
});