# GitLab MR Diff Viewer

一个用于查看 GitLab Merge Request 差异内容的 Chrome 浏览器扩展。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.1-green.svg)](https://github.com/your-username/gitlab-diff-viewer)

## 功能特性

- 🔍 **一键查看 MR Diff**：在 GitLab MR 页面添加浮动按钮，点击即可查看完整的 diff 内容
- ⚙️ **可视化配置**：提供友好的配置页面，轻松管理 GitLab 服务器和 Token 设置
- 🔐 **Token 认证**：支持 GitLab Access Token 认证，安全访问私有仓库
- 🌐 **多服务器支持**：支持自定义 GitLab 服务器地址，不限于内网环境
- 📱 **友好界面**：在新窗口中以格式化的方式展示 diff 内容
- 🎯 **自动识别**：自动识别当前 MR 页面并提取项目信息
- 🔧 **实时测试**：内置 Token 有效性测试功能
- 💾 **配置同步**：使用 Chrome 同步存储，配置在多设备间自动同步

## 项目结构

```
gitlab-diff-viewer/
├── manifest.json    # Chrome 扩展配置文件
├── content.js       # 内容脚本，主要功能实现
├── background.js    # 后台脚本，处理消息传递
├── options.html     # 配置页面 HTML
├── options.js       # 配置页面逻辑
├── popup.html       # 弹出窗口 HTML
├── popup.js         # 弹出窗口逻辑
├── icon.png         # 扩展图标
└── README.md        # 项目说明文档
```

## 技术实现

### manifest.json
- **Manifest V3**：使用最新的 Chrome 扩展 API 版本
- **权限配置**：
  - `scripting`：允许注入脚本
  - `storage`：本地存储 Token
- **主机权限**：仅限 `https://gitlab.example.com/*`
- **内容脚本**：自动在 MR 页面注入功能脚本

### content.js 核心功能

1. **Token 管理**
   ```javascript
   const token = localStorage.getItem("gitlab_token") || prompt("请输入 GitLab Access Token");
   ```
   - 从本地存储获取 Token
   - 首次使用时提示用户输入
   - 自动保存到本地存储

2. **URL 解析**
   ```javascript
   const match = window.location.href.match(/gitlab\.example\.com\/(.+?)\/-\/merge_requests\/(\d+)/);
   ```
   - 正则表达式提取项目路径和 MR ID
   - 自动编码项目路径用于 API 调用

3. **UI 组件**
   - 创建固定位置的浮动按钮
   - 绿色背景，右上角定位
   - 响应式设计，适配不同屏幕

4. **API 调用**
   ```javascript
   const api = `https://gitlab.example.com/api/v4/projects/${encodedPath}/merge_requests/${mrId}/changes`;
   ```
   - 使用 GitLab API v4
   - 获取 MR 的完整变更信息
   - 包含文件路径和 diff 内容

5. **Diff 展示**
   - 格式化 diff 输出
   - 新窗口展示，避免影响原页面
   - 保持原始 diff 格式的可读性

## 安装和配置

### 快速开始

#### 1. 下载和安装

**方式一：从 Chrome Web Store 安装（暂不支持）**
1. 访问 [Chrome Web Store](https://chrome.google.com/webstore) 搜索 "GitLab MR Diff Viewer" 
1. 点击「添加至 Chrome」
2. 确认安装权限

**方式二：手动安装开发版**
1. 下载或克隆本项目：
   ```bash
   git clone https://github.com/your-username/gitlab-diff-viewer.git
   cd gitlab-diff-viewer
   ```
2. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目文件夹

#### 2. 配置设置

**准备工作**
- 确保有 GitLab Access Token（需要 `read_api` 权限）
- Chrome 浏览器版本 88+（支持 Manifest V3）

##### 方式一：使用配置页面（推荐）
1. 点击扩展图标，选择「打开配置页面」
2. 填写 GitLab 服务器地址（默认：`https://gitlab.example.com`）
3. 输入 GitLab Access Token
4. 点击「测试连接」验证配置
5. 点击「保存配置」完成设置

##### 方式二：右键菜单
1. 右键点击扩展图标
2. 选择「选项」打开配置页面

### 4. 使用方法
1. 访问任意 GitLab MR 页面
2. 页面右上角会出现按钮组：
   - 🔍 **查看 MR Diff**：查看完整差异内容
   - 🔧 **测试 Token**：验证 Token 有效性
   - 🔄 **重置 Token**：重新配置 Token
3. 点击相应按钮使用功能

## 配置说明

### GitLab Access Token 获取
1. 登录 GitLab
2. 进入 Settings → Access Tokens
3. 创建新 Token，勾选 `read_api` 权限
4. 复制生成的 Token

### 支持的页面
- 支持任意 GitLab 服务器（包括 GitLab.com、自托管实例等）
- 自动匹配 MR 页面路径：`/*/merge_requests/*`
- 通过配置页面可以设置多个 GitLab 服务器

## 开发指南

### 本地开发
1. Fork 并克隆项目：
   ```bash
   git clone https://github.com/your-username/gitlab-diff-viewer.git
   cd gitlab-diff-viewer
   ```
2. 按照上述「手动安装开发版」步骤加载扩展
3. 修改代码后在扩展管理页面点击刷新按钮
4. 在 GitLab MR 页面测试功能

### 团队配置（可选）

如果您是团队管理员，可以为团队预配置 GitLab 服务器：

1. 复制配置模板文件：
   ```bash
   cp config.js.example config.js
   cp TEAM_CONFIG.md.example TEAM_CONFIG.md
   ```
2. 编辑 `config.js` 设置团队的 GitLab 服务器地址
3. 将配置好的扩展分发给团队成员

详细说明请参考 `TEAM_CONFIG.md.example` 文件。

### 贡献代码

我们欢迎任何形式的贡献！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 扩展功能建议
- 支持更多 diff 展示格式
- 添加 diff 下载功能
- 集成代码高亮显示
- 支持 diff 统计信息
- 添加快捷键支持

## 注意事项

- ⚠️ Token 存储在本地，请妥善保管
- ⚠️ 仅支持有权限访问的项目
- ⚠️ 需要网络连接访问 GitLab API
- ⚠️ 大型 MR 的 diff 可能加载较慢

## 版本信息

- **当前版本**：1.1
- **Manifest 版本**：3
- **兼容性**：Chrome 88+
- **新增功能**：
  - ⚙️ 可视化配置页面
  - 🌐 多 GitLab 服务器支持
  - 🔧 Token 有效性测试
  - 💾 配置云端同步
  - 📱 扩展弹出窗口

## 问题反馈

如果您遇到问题或有功能建议，请通过以下方式联系我们：

- [GitHub Issues](https://github.com/your-username/gitlab-diff-viewer/issues)
- [功能请求](https://github.com/your-username/gitlab-diff-viewer/issues/new?template=feature_request.md)
- [Bug 报告](https://github.com/your-username/gitlab-diff-viewer/issues/new?template=bug_report.md)

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

感谢所有为本项目做出贡献的开发者！

---

如果这个项目对您有帮助，请考虑给我们一个 ⭐️！