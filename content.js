// 诊断函数
const runDiagnosis = async (gitlabUrl, token, projectPath, mrId) => {
  try {
    console.log('=== 开始详细诊断 ===');
    
    // 1. 测试Token
    console.log('1. 测试Token有效性...');
    const userResponse = await fetch(`${gitlabUrl}/api/v4/user`, {
      headers: { 'PRIVATE-TOKEN': token }
    });
    
    if (!userResponse.ok) {
      console.error('❌ Token无效:', userResponse.status);
      alert('❌ Token无效，请重新配置');
      return;
    }
    
    const user = await userResponse.json();
    console.log('✅ Token有效，用户:', user.name);
    
    // 2. 检查项目是否存在
    console.log('2. 检查项目是否存在...');
    const encodedPath = projectPath.replaceAll('/', '%2F');
    const projectResponse = await fetch(`${gitlabUrl}/api/v4/projects/${encodedPath}`, {
      headers: { 'PRIVATE-TOKEN': token }
    });
    
    if (!projectResponse.ok) {
      console.error('❌ 项目不存在或无权限:', projectResponse.status);
      
      // 尝试搜索相似项目
      console.log('3. 搜索相似项目...');
      const searchTerm = projectPath.split('/').pop();
      const searchResponse = await fetch(`${gitlabUrl}/api/v4/projects?search=${encodeURIComponent(searchTerm)}&per_page=10`, {
        headers: { 'PRIVATE-TOKEN': token }
      });
      
      if (searchResponse.ok) {
        const projects = await searchResponse.json();
        const suggestions = projects.filter(p => 
          p.path_with_namespace.toLowerCase().includes(projectPath.toLowerCase()) ||
          p.path_with_namespace.includes(projectPath)
        ).slice(0, 5);
        
        let message = `❌ 项目 "${projectPath}" 不存在或无权限访问\n\n`;
        if (suggestions.length > 0) {
          message += '🔍 找到相似项目:\n';
          suggestions.forEach(p => {
            message += `• ${p.path_with_namespace}\n`;
          });
          message += '\n请检查项目路径是否正确';
        } else {
          message += '未找到相似项目，请检查：\n';
          message += '• 项目路径是否正确\n';
          message += '• 是否有项目访问权限\n';
          message += '• Token权限是否足够';
        }
        alert(message);
      }
      return;
    }
    
    const project = await projectResponse.json();
    console.log('✅ 项目存在:', project.name);
    
    // 3. 检查MR是否存在
    console.log('4. 检查MR是否存在...');
    const mrResponse = await fetch(`${gitlabUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrId}`, {
      headers: { 'PRIVATE-TOKEN': token }
    });
    
    if (!mrResponse.ok) {
      console.error('❌ MR不存在:', mrResponse.status);
      
      // 获取最近的MR列表
      const mrListResponse = await fetch(`${gitlabUrl}/api/v4/projects/${encodedPath}/merge_requests?per_page=10`, {
        headers: { 'PRIVATE-TOKEN': token }
      });
      
      if (mrListResponse.ok) {
        const mrs = await mrListResponse.json();
        let message = `❌ MR #${mrId} 不存在\n\n`;
        if (mrs.length > 0) {
          message += '📋 项目最近的MR:\n';
          mrs.slice(0, 5).forEach(mr => {
            message += `• MR !${mr.iid}: ${mr.title} (${mr.state})\n`;
          });
          message += '\n请检查MR编号是否正确';
        } else {
          message += '该项目暂无MR';
        }
        alert(message);
      }
      return;
    }
    
    const mr = await mrResponse.json();
    console.log('✅ MR存在:', mr.title);
    
    // 4. 检查MR changes API
    console.log('5. 测试MR changes API...');
    const changesResponse = await fetch(`${gitlabUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrId}/changes`, {
      headers: { 'PRIVATE-TOKEN': token }
    });
    
    if (changesResponse.ok) {
      console.log('✅ MR changes API正常');
      alert('✅ 诊断完成：所有检查都通过了\n\n这可能是临时网络问题，请重试');
    } else {
      console.error('❌ MR changes API失败:', changesResponse.status);
      alert(`❌ MR changes API失败 (HTTP ${changesResponse.status})\n\n可能是权限问题或API限制`);
    }
    
  } catch (error) {
    console.error('诊断过程出错:', error);
    alert(`❌ 诊断过程出错: ${error.message}`);
  }
};

// 添加延迟执行，确保页面完全加载
const initExtension = async () => {
  console.log('GitLab Diff Viewer 扩展开始初始化...');
  // 从配置中获取设置
  let config = {};
  try {
    config = await chrome.storage.sync.get(['gitlab_url', 'gitlab_token']);
  } catch (error) {
    console.log('无法访问chrome.storage，使用localStorage');
  }
  
  let token = config.gitlab_token || localStorage.getItem("gitlab_token");
  
  // 尝试从配置文件获取默认GitLab URL
  let defaultGitlabUrl = "https://gitlab.example.com";
  try {
    if (typeof GITLAB_CONFIG !== 'undefined' && GITLAB_CONFIG.DEFAULT_GITLAB_URL) {
      defaultGitlabUrl = GITLAB_CONFIG.DEFAULT_GITLAB_URL;
    }
  } catch (error) {
    console.log('无法加载配置文件，使用默认地址');
  }
  
  let gitlabUrl = config.gitlab_url || localStorage.getItem("gitlab_url") || defaultGitlabUrl;
  
  // 如果没有token，提示用户配置
  if (!token) {
    const userChoice = confirm("需要配置 GitLab Access Token 才能使用此功能。\n\n点击'确定'打开配置页面\n点击'取消'手动输入Token");
    
    if (userChoice) {
      // 尝试打开配置页面
      try {
        chrome.runtime.sendMessage({action: 'openOptions'});
        return;
      } catch (error) {
        console.log('无法打开配置页面，回退到手动输入');
      }
    }
    
    // 手动输入token
    token = prompt("请输入 GitLab Access Token:\n\n1. 访问 GitLab → Settings → Access Tokens\n2. 创建新token，勾选 'read_api' 权限\n3. 复制生成的token");
    if (!token) {
      console.log('用户取消输入token');
      return;
    }
    localStorage.setItem("gitlab_token", token);
  }
  
  // 验证token格式
  if (token.length < 20) {
    alert("⚠️ Token 格式可能不正确\nGitLab Access Token 通常是20位以上的字符串");
  }

  // 解析当前 URL 获取项目信息
  console.log('当前页面URL:', window.location.href);
  console.log('配置的GitLab URL:', gitlabUrl);
  
  // 更健壮的URL匹配逻辑
  let match = null;
  let projectPath = null;
  let mrId = null;
  
  // 通用的MR页面匹配模式
  const generalPattern = /\/-\/merge_requests\/(\d+)/;
  const mrMatch = window.location.href.match(generalPattern);
  
  if (!mrMatch) {
    console.log('当前页面不是支持的 GitLab MR 页面');
    console.log('页面URL:', window.location.href);
    console.log('期望的URL格式: */-/merge_requests/*');
    return;
  }
  
  mrId = mrMatch[1];
  console.log('解析到的MR ID:', mrId);
  
  // 提取项目路径：从域名后到/-/merge_requests之前的部分
  const url = new URL(window.location.href);
  const pathname = url.pathname;
  console.log('URL pathname:', pathname);
  
  // 匹配项目路径：去掉开头的/和结尾的/-/merge_requests/xxx
  const projectMatch = pathname.match(/^\/(.+?)\/-\/merge_requests\/\d+/);
  if (!projectMatch) {
    console.log('无法解析项目路径');
    console.log('pathname:', pathname);
    return;
  }
  
  projectPath = projectMatch[1];
  console.log('解析到的项目路径:', projectPath);
  
  // 验证项目路径格式
  if (!projectPath || projectPath.includes('//') || projectPath.startsWith('-') || projectPath.endsWith('-')) {
    console.log('项目路径格式不正确:', projectPath);
    return;
  }
  
  // 正确编码项目路径：GitLab API需要将/替换为%2F
   const encodedPath = projectPath.replaceAll("/", "%2F");
   console.log('编码后的项目路径:', encodedPath);
   console.log('原始项目路径:', projectPath);
   
   // 验证编码结果
   if (encodedPath === projectPath) {
     console.log('警告：项目路径中没有斜杠，可能解析有误');
   }

  // 检查是否已经存在按钮，避免重复创建
  const existingContainer = document.getElementById('gitlab-diff-viewer-buttons');
  if (existingContainer) {
    console.log('按钮已存在，跳过创建');
    return;
  }
  
  console.log('开始创建悬浮按钮...');
  
  // 创建悬浮按钮容器
  const fabContainer = document.createElement("div");
  fabContainer.id = 'gitlab-diff-viewer-fab';
  
  // 默认位置：右下角
  const defaultPosition = { bottom: 30, right: 30 };
  
  // 恢复保存的位置
  const savedPosition = localStorage.getItem('gitlab-diff-viewer-position');
  let position = defaultPosition;
  if (savedPosition) {
    try {
      const pos = JSON.parse(savedPosition);
      position = { left: pos.left, top: pos.top };
    } catch (e) {
      console.log('恢复位置失败，使用默认位置');
    }
  }
  
  // 构建容器样式
  let containerStyle = 'position: fixed; z-index: 9999; width: 200px; height: 200px; pointer-events: none;';
  Object.entries(position).forEach(([key, value]) => {
    containerStyle += ` ${key}: ${typeof value === 'number' ? value + 'px' : value};`;
  });
  
  fabContainer.style.cssText = containerStyle;
  
  // 创建主按钮（圆形）
  const mainBtn = document.createElement("button");
  mainBtn.innerHTML = "📋";
  mainBtn.title = "GitLab Diff Viewer";
  mainBtn.style.cssText = `
    position: absolute;
    bottom: 0;
    right: 0;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: scale(1);
  `;
  
  // 子按钮配置
  const subButtons = [
    { icon: "🔍", title: "查看 Diff", color: "#4CAF50", action: "diff" },
    { icon: "📋", title: "复制 Diff", color: "#FF5722", action: "copy" },
    { icon: "🔧", title: "测试 Token", color: "#2196F3", action: "test" },
    { icon: "🔄", title: "重置 Token", color: "#FF9800", action: "reset" },
    { icon: "⚙️", title: "设置", color: "#9C27B0", action: "settings" }
  ];
  
  // 创建子按钮
  const subBtnElements = [];
  subButtons.forEach((btnData, index) => {
    const subBtn = document.createElement("button");
    subBtn.innerHTML = btnData.icon;
    subBtn.title = btnData.title;
    subBtn.dataset.action = btnData.action;
    
    subBtn.style.cssText = `
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${btnData.color};
      color: white;
      border: none;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0) translate(0, 0);
      bottom: 8px;
      right: 8px;
    `;
    
    // 添加悬停效果和提示
    subBtn.addEventListener('mouseenter', () => {
      subBtn.style.transform = subBtn.style.transform.replace('scale(1)', 'scale(1.1)');
      subBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
      
      // 清理可能存在的旧提示框
      const existingTooltip = document.getElementById(`tooltip-${btnData.action}`);
      if (existingTooltip) {
        existingTooltip.remove();
      }
      
      // 创建悬停提示
      const tooltip = document.createElement('div');
      tooltip.id = `tooltip-${btnData.action}`;
      tooltip.textContent = btnData.title;
      tooltip.style.cssText = `
        position: fixed;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        white-space: nowrap;
        z-index: 10001;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      
      document.body.appendChild(tooltip);
      
      // 定位提示框
      const rect = subBtn.getBoundingClientRect();
      tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
      tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
      
      // 显示动画
      requestAnimationFrame(() => {
        if (tooltip.parentNode) {
          tooltip.style.opacity = '1';
        }
      });
    });
    
    subBtn.addEventListener('mouseleave', () => {
      subBtn.style.transform = subBtn.style.transform.replace('scale(1.1)', 'scale(1)');
      subBtn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      
      // 移除提示框
      const tooltip = document.getElementById(`tooltip-${btnData.action}`);
      if (tooltip) {
        tooltip.style.opacity = '0';
        setTimeout(() => {
          if (tooltip && tooltip.parentNode) {
            tooltip.remove();
          }
        }, 200);
      }
    });
    
    // 添加点击时清理提示框
    subBtn.addEventListener('click', () => {
      const tooltip = document.getElementById(`tooltip-${btnData.action}`);
      if (tooltip) {
        tooltip.remove();
      }
    });
    
    fabContainer.appendChild(subBtn);
    subBtnElements.push(subBtn);
  });
  
  // 展开/收起状态
  let isExpanded = false;
  
  // 计算子按钮位置（围绕主按钮）
  const calculateSubButtonPositions = () => {
    const radius = 70; // 围绕半径
    const startAngle = -Math.PI / 2; // 从顶部开始
    const angleStep = (Math.PI * 1.5) / (subButtons.length - 1); // 分布在270度范围内
    
    return subButtons.map((_, index) => {
      const angle = startAngle + (angleStep * index);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return { x: x + 8, y: y + 8 }; // 8px是为了居中对齐
    });
  };
  
  const subButtonPositions = calculateSubButtonPositions();
  
  // 获取智能展开位置
  const getSmartExpandPositions = () => {
    const rect = fabContainer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 判断按钮在页面中的位置
    const isRight = rect.left > viewportWidth / 2;
    const isBottom = rect.top > viewportHeight / 2;
    
    const distance = 50; // 按钮间距
    const positions = [];
    
    if (isRight && isBottom) {
      // 右下角：在上方垂直排列
      for (let i = 0; i < 5; i++) {
        positions.push({
          x: 0,
          y: -(i + 1) * distance
        });
      }
    } else if (!isRight && !isBottom) {
      // 左上角：在下方垂直排列
      for (let i = 0; i < 5; i++) {
        positions.push({
          x: 0,
          y: (i + 1) * distance
        });
      }
    } else if (isRight && !isBottom) {
      // 右上角：在下方垂直排列
      for (let i = 0; i < 5; i++) {
        positions.push({
          x: 0,
          y: (i + 1) * distance
        });
      }
    } else {
      // 左下角：在上方垂直排列
      for (let i = 0; i < 5; i++) {
        positions.push({
          x: 0,
          y: -(i + 1) * distance
        });
      }
    }
    
    return positions;
  };
  
  // 展开/收起动画
  const toggleExpansion = () => {
    isExpanded = !isExpanded;
    
    // 清理所有提示框
    const tooltips = document.querySelectorAll('[id^="tooltip-"]');
    tooltips.forEach(tooltip => tooltip.remove());
    
    // 主按钮动画
    if (isExpanded) {
      mainBtn.style.transform = 'scale(1.1) rotate(45deg)';
      mainBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
    } else {
      mainBtn.style.transform = 'scale(1) rotate(0deg)';
      mainBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    // 获取智能展开位置
    const smartPositions = getSmartExpandPositions();
    
    // 子按钮动画
    subBtnElements.forEach((btn, index) => {
      if (isExpanded) {
        const pos = smartPositions[index];
        setTimeout(() => {
          btn.style.opacity = '1';
          btn.style.transform = `scale(1) translate(${pos.x}px, ${pos.y}px)`;
        }, index * 50); // 错开动画时间
      } else {
        setTimeout(() => {
          btn.style.opacity = '0';
          btn.style.transform = 'scale(0) translate(0, 0)';
        }, (subBtnElements.length - index - 1) * 30); // 反向错开
      }
    });
  };
  
  // 主按钮点击事件
  mainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleExpansion();
  });
  
  // 主按钮悬停效果
  mainBtn.addEventListener('mouseenter', () => {
    if (!isExpanded) {
      mainBtn.style.transform = 'scale(1.05)';
      mainBtn.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
    }
  });
  
  mainBtn.addEventListener('mouseleave', () => {
    if (!isExpanded) {
      mainBtn.style.transform = 'scale(1)';
      mainBtn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    }
  });
  
  // 点击页面其他地方收起按钮
  document.addEventListener('click', (e) => {
    if (!fabContainer.contains(e.target) && isExpanded) {
      toggleExpansion();
    }
    
    // 清理所有提示框
    const tooltips = document.querySelectorAll('[id^="tooltip-"]');
    tooltips.forEach(tooltip => tooltip.remove());
  });
  
  // 拖拽功能
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let dragStartTime = 0;
  
  mainBtn.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      dragStartTime = Date.now();
      isDragging = true;
      const rect = fabContainer.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      mainBtn.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      
      // 限制在视窗范围内
      const maxX = window.innerWidth - 200;
      const maxY = window.innerHeight - 200;
      
      const constrainedX = Math.max(0, Math.min(x, maxX));
      const constrainedY = Math.max(0, Math.min(y, maxY));
      
      fabContainer.style.left = constrainedX + 'px';
      fabContainer.style.top = constrainedY + 'px';
      fabContainer.style.right = 'auto';
      fabContainer.style.bottom = 'auto';
    }
  });
  
  document.addEventListener('mouseup', (e) => {
    if (isDragging) {
      isDragging = false;
      mainBtn.style.cursor = 'pointer';
      
      // 如果拖拽时间很短，认为是点击而不是拖拽
      const dragDuration = Date.now() - dragStartTime;
      if (dragDuration < 200) {
        // 这是一个点击，不是拖拽
        return;
      }
      
      // 保存位置
      const rect = fabContainer.getBoundingClientRect();
      localStorage.setItem('gitlab-diff-viewer-position', JSON.stringify({
        left: rect.left,
        top: rect.top
      }));
    }
  });
  
  // 添加主按钮到容器
  fabContainer.appendChild(mainBtn);
  
  // 子按钮功能绑定
  const btn = subBtnElements.find(btn => btn.dataset.action === 'diff');
  const copyBtn = subBtnElements.find(btn => btn.dataset.action === 'copy');
  const testBtn = subBtnElements.find(btn => btn.dataset.action === 'test');
  const resetBtn = subBtnElements.find(btn => btn.dataset.action === 'reset');
  const settingsBtn = subBtnElements.find(btn => btn.dataset.action === 'settings');
  
  // 设置按钮功能
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({action: 'openOptions'});
      } else {
        alert('请在扩展管理页面中打开设置');
      }
      toggleExpansion();
    });
  }
  
  // 等待页面加载完成后再添加按钮
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(fabContainer);
      console.log('悬浮按钮已添加到页面 (DOMContentLoaded)');
    });
  } else {
    document.body.appendChild(fabContainer);
    console.log('悬浮按钮已添加到页面 (立即)');
  }
  
  // 测试Token功能
  testBtn.onclick = async () => {
    try {
      // 重新获取最新的token
      let currentConfig = {};
      try {
        currentConfig = await chrome.storage.sync.get(['gitlab_url', 'gitlab_token']);
      } catch (e) {
        currentConfig = {
          gitlab_url: localStorage.getItem('gitlab_url') || 'https://gitlab.example.com',
          gitlab_token: localStorage.getItem('gitlab_token')
        };
      }
      
      const currentGitlabUrl = currentConfig.gitlab_url || 'https://gitlab.example.com';
      const currentToken = currentConfig.gitlab_token;
      
      const testApi = `${currentGitlabUrl}/api/v4/user`;
      const res = await fetch(testApi, {
        headers: { "PRIVATE-TOKEN": currentToken }
      });
      
      if (res.ok) {
        const user = await res.json();
        alert(`✅ Token 有效！\n\n服务器: ${currentGitlabUrl}\n用户: ${user.name}\n用户名: ${user.username}\nID: ${user.id}`);
      } else {
        alert(`❌ Token 无效\n\n服务器: ${currentGitlabUrl}\nHTTP ${res.status}: ${res.statusText}`);
      }
    } catch (error) {
      alert(`❌ 测试失败\n\n服务器: ${gitlabUrl}\n错误: ${error.message}`);
    }
  };
  
  // 重置Token功能
  resetBtn.onclick = () => {
    if (confirm("确定要重置 Token 吗？")) {
      localStorage.removeItem("gitlab_token");
      location.reload();
    }
  };

  // 复制Diff功能
  copyBtn.onclick = async () => {
    try {
      console.log('=== 开始复制 MR Diff ===');
      
      // 重新获取最新的配置和token
      let currentConfig = {};
      try {
        currentConfig = await chrome.storage.sync.get(['gitlab_url', 'gitlab_token']);
      } catch (e) {
        console.log('使用本地存储获取配置');
        currentConfig = {
          gitlab_url: localStorage.getItem('gitlab_url') || 'https://gitlab.example.com',
          gitlab_token: localStorage.getItem('gitlab_token')
        };
      }
      
      const currentGitlabUrl = currentConfig.gitlab_url || 'https://gitlab.example.com';
      const currentToken = currentConfig.gitlab_token;
      
      if (!currentToken) {
        alert('❌ 未找到有效的 Token\n\n请先在配置页面设置 GitLab Access Token');
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({action: 'openOptions'});
        }
        return;
      }
      
      // 构建API URL
      const api = `${currentGitlabUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrId}/changes`;
      console.log('复制功能 - API URL:', api);
      
      // 显示加载提示
      copyBtn.innerHTML = '⏳';
      copyBtn.title = '正在获取 Diff...';
      
      // 发送API请求
      const res = await fetch(api, {
        method: 'GET',
        headers: {
          'PRIVATE-TOKEN': currentToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (!data.changes || !Array.isArray(data.changes)) {
        throw new Error('响应数据格式错误');
      }
      
      if (data.changes.length === 0) {
        alert('📝 此 MR 没有文件变更');
        return;
      }
      
      // 生成diff文本
      const diffText = data.changes.map((change) => {
        const header = `diff --git a/${change.old_path} b/${change.new_path}`;
        const diff = change.diff || '(无变更内容)';
        return `${header}\n${diff}\n`;
      }).join('\n');
      
      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(diffText);
        
        // 显示成功状态
        copyBtn.innerHTML = '✅';
        copyBtn.title = 'Diff 已复制到剪贴板';
        
        // 显示成功提示
        alert(`✅ Diff 已复制到剪贴板！\n\n包含 ${data.changes.length} 个文件的变更\n总长度: ${diffText.length} 字符`);
        
        // 收起按钮
        toggleExpansion();
        
      } catch (clipboardError) {
        console.error('复制到剪贴板失败:', clipboardError);
        
        // 降级方案：创建临时文本区域
        const textArea = document.createElement('textarea');
        textArea.value = diffText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          alert(`✅ Diff 已复制到剪贴板！\n\n包含 ${data.changes.length} 个文件的变更\n总长度: ${diffText.length} 字符`);
          toggleExpansion();
        } catch (execError) {
          alert('❌ 复制失败，请手动复制\n\n' + diffText.substring(0, 500) + '...');
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
    } catch (error) {
      console.error('复制Diff失败:', error);
      alert(`❌ 复制 Diff 失败\n\n错误: ${error.message}`);
    } finally {
      // 恢复按钮状态
      setTimeout(() => {
        copyBtn.innerHTML = '📋';
        copyBtn.title = '复制 Diff';
      }, 2000);
    }
  };

  btn.onclick = async () => {
    try {
      console.log('=== 开始获取 MR Diff ===');
      
      // 重新获取最新的配置和token
       let currentConfig = {};
       try {
         currentConfig = await chrome.storage.sync.get(['gitlab_url', 'gitlab_token']);
       } catch (e) {
         console.log('使用本地存储获取配置');
         currentConfig = {
           gitlab_url: localStorage.getItem('gitlab_url') || 'https://gitlab.example.com',
           gitlab_token: localStorage.getItem('gitlab_token')
         };
       }
       
       const currentGitlabUrl = currentConfig.gitlab_url || 'https://gitlab.example.com';
       const currentToken = currentConfig.gitlab_token;
      
      console.log('当前GitLab URL:', currentGitlabUrl);
      console.log('当前Token状态:', currentToken ? '已设置' : '未设置');
      console.log('项目路径:', projectPath);
      console.log('MR ID:', mrId);
      console.log('编码后的项目路径:', encodedPath);
      
      if (!currentToken) {
        alert('❌ 未找到有效的 Token\n\n请先在配置页面设置 GitLab Access Token');
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({action: 'openOptions'});
        }
        return;
      }
      
      // 构建API URL
       const api = `${currentGitlabUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrId}/changes`;
       console.log('=== API 调用信息 ===');
       console.log('GitLab URL:', currentGitlabUrl);
       console.log('原始项目路径:', projectPath);
       console.log('编码后项目路径:', encodedPath);
       console.log('MR ID:', mrId);
       console.log('完整API URL:', api);
       console.log('Token (前10位):', currentToken.substring(0, 10) + '...');
       
       // 验证API URL格式
       if (!api.includes('/api/v4/projects/') || !api.includes('/merge_requests/')) {
         console.error('API URL格式可能有误:', api);
       }
      
      // 发送API请求
      console.log('发送API请求...');
      const res = await fetch(api, {
        method: 'GET',
        headers: {
          'PRIVATE-TOKEN': currentToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('API响应状态:', res.status, res.statusText);
      console.log('响应头:', Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        let errorText = '';
        try {
          errorText = await res.text();
          console.error('API错误响应内容:', errorText);
        } catch (e) {
          console.error('无法读取错误响应:', e);
        }
        
        let errorMsg = `❌ 获取 diff 失败 (HTTP ${res.status})\n\n`;
        
        if (res.status === 401) {
          errorMsg += '🔑 认证失败:\n';
          errorMsg += '• Token 无效或已过期\n';
          errorMsg += '• 请检查 Token 是否正确\n';
          errorMsg += '• 确保 Token 有 read_api 权限';
        } else if (res.status === 404) {
           errorMsg += '🔍 资源未找到:\n';
           errorMsg += '• 项目路径可能不正确\n';
           errorMsg += '• MR 可能不存在\n';
           errorMsg += '• 检查是否有访问权限\n';
           errorMsg += `• 项目路径: ${projectPath}\n`;
           errorMsg += `• 编码后路径: ${encodedPath}\n`;
           errorMsg += `• MR ID: ${mrId}\n`;
           errorMsg += `• API URL: ${api}\n\n`;
           errorMsg += '💡 可能的解决方案:\n';
           errorMsg += '• 检查项目路径是否正确\n';
           errorMsg += '• 确认MR编号是否存在\n';
           errorMsg += '• 验证Token是否有项目访问权限';
        } else if (res.status === 403) {
          errorMsg += '🚫 权限不足:\n';
          errorMsg += '• Token 权限不够\n';
          errorMsg += '• 需要项目的访问权限\n';
          errorMsg += '• 检查 Token 的 scope 设置';
        } else {
          errorMsg += `🔧 服务器错误:\n• ${res.statusText}`;
          if (errorText) {
            errorMsg += `\n• ${errorText.substring(0, 200)}`;
          }
        }
        
        console.error('完整错误信息:', errorMsg);
        
        if (res.status === 401 && confirm(errorMsg + '\n\n是否重新配置 Token？')) {
           if (chrome.runtime && chrome.runtime.sendMessage) {
             chrome.runtime.sendMessage({action: 'openOptions'});
           } else {
             localStorage.removeItem('gitlab_token');
             location.reload();
           }
         } else if (res.status === 404) {
           // 对于404错误，提供详细诊断
           const shouldDiagnose = confirm(errorMsg + '\n\n是否运行详细诊断来查找问题？');
           if (shouldDiagnose) {
             console.log('🔍 开始运行详细诊断...');
             await runDiagnosis(currentGitlabUrl, currentToken, projectPath, mrId);
           }
         } else {
           alert(errorMsg);
         }
        return;
      }

      console.log('开始解析响应数据...');
      const data = await res.json();
      console.log('API响应数据:', data);
      
      if (!data.changes || !Array.isArray(data.changes)) {
        console.error('响应数据格式错误:', data);
        alert('❌ 响应数据格式错误\n\n请检查API返回的数据格式');
        return;
      }
      
      if (data.changes.length === 0) {
        alert('📝 此 MR 没有文件变更');
        return;
      }
      
      console.log(`找到 ${data.changes.length} 个文件变更`);
      
      // 生成diff文本
      const diffText = data.changes.map((change, index) => {
        console.log(`处理文件 ${index + 1}:`, change.old_path, '->', change.new_path);
        const header = `diff --git a/${change.old_path} b/${change.new_path}`;
        const diff = change.diff || '(无变更内容)';
        return `${header}\n${diff}\n`;
      }).join('\n');

      console.log('生成的diff文本长度:', diffText.length);
      
      // 创建新窗口展示diff
      console.log('打开新窗口展示diff...');
      const win = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (!win) {
        alert('❌ 无法打开新窗口\n\n请检查浏览器的弹窗拦截设置');
        return;
      }
      
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MR #${mrId} Diff - ${projectPath}</title>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 20px; 
              background: #f8f9fa; 
              line-height: 1.4;
            }
            .header { 
              background: #007bff; 
              color: white; 
              padding: 15px; 
              border-radius: 8px; 
              margin-bottom: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header h2 { margin: 0 0 10px 0; }
            .header p { margin: 5px 0; opacity: 0.9; }
            .diff-container {
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            pre { 
              margin: 0;
              padding: 20px; 
              white-space: pre-wrap; 
              word-wrap: break-word;
              overflow-x: auto;
              font-size: 13px;
            }
            .file-header {
              background: #e9ecef;
              padding: 10px 20px;
              border-bottom: 1px solid #dee2e6;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>📋 MR #${mrId} Diff</h2>
            <p><strong>项目:</strong> ${projectPath}</p>
            <p><strong>文件数:</strong> ${data.changes.length}</p>
            <p><strong>GitLab:</strong> ${currentGitlabUrl}</p>
          </div>
          <div class="diff-container">
            <pre>${diffText}</pre>
          </div>
        </body>
        </html>
      `);
      
      win.document.close();
      console.log('=== MR Diff 获取完成 ===');
      
    } catch (error) {
      console.error('=== 扩展运行错误 ===');
      console.error('错误类型:', error.name);
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      
      let errorMsg = `❌ 扩展运行出错\n\n`;
      errorMsg += `错误类型: ${error.name}\n`;
      errorMsg += `错误信息: ${error.message}\n\n`;
      errorMsg += '请检查浏览器控制台获取详细信息';
      
      alert(errorMsg);
    }
   };
 };

// 多种初始化时机，确保扩展能够正常工作
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtension);
} else {
  initExtension();
}

// 监听页面变化（适用于单页应用）
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('页面URL发生变化:', url);
    // 延迟执行，等待页面内容更新
    setTimeout(initExtension, 1000);
  }
}).observe(document, {subtree: true, childList: true});

console.log('GitLab Diff Viewer 扩展已加载');
