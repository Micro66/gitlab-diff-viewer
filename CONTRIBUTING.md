# 贡献指南

感谢您对 GitLab MR Diff Viewer 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议，请：

1. 检查 [Issues](https://github.com/your-username/gitlab-diff-viewer/issues) 确保问题尚未被报告
2. 使用相应的模板创建新的 Issue：
   - [Bug 报告](https://github.com/your-username/gitlab-diff-viewer/issues/new?template=bug_report.md)
   - [功能请求](https://github.com/your-username/gitlab-diff-viewer/issues/new?template=feature_request.md)

### 提交代码

1. **Fork 项目**
   ```bash
   git clone https://github.com/your-username/gitlab-diff-viewer.git
   cd gitlab-diff-viewer
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行开发**
   - 遵循现有的代码风格
   - 添加必要的注释
   - 确保代码可以正常运行

4. **测试您的更改**
   - 在 Chrome 中加载扩展
   - 在不同的 GitLab MR 页面测试功能
   - 确保配置页面正常工作

5. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **推送到您的 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**
   - 提供清晰的 PR 描述
   - 说明您的更改解决了什么问题
   - 如果相关，请引用相关的 Issues

## 开发环境设置

### 前置要求

- Chrome 浏览器（版本 88+）
- 文本编辑器或 IDE
- Git

### 本地开发

1. 克隆项目到本地
2. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择项目文件夹
5. 修改代码后，在扩展管理页面点击刷新按钮

### 项目结构

```
gitlab-diff-viewer/
├── manifest.json          # 扩展配置文件
├── content.js             # 内容脚本
├── background.js          # 后台脚本
├── options.html/js        # 配置页面
├── popup.html/js          # 弹出窗口
├── config.js.example      # 配置模板
└── icon.png              # 扩展图标
```

## 代码规范

### JavaScript

- 使用 ES6+ 语法
- 使用 2 空格缩进
- 使用分号结尾
- 变量和函数使用驼峰命名
- 常量使用大写字母和下划线

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

示例：
```
feat: add support for GitLab.com
fix: resolve token validation issue
docs: update installation guide
```

## 发布流程

项目维护者会定期发布新版本：

1. 更新 `manifest.json` 中的版本号
2. 更新 `README.md` 中的版本信息
3. 创建 Git tag
4. 发布到 Chrome Web Store

## 获取帮助

如果您在贡献过程中遇到问题，可以：

- 查看现有的 [Issues](https://github.com/your-username/gitlab-diff-viewer/issues)
- 创建新的 Issue 寻求帮助
- 查看项目的 [Wiki](https://github.com/your-username/gitlab-diff-viewer/wiki)（如果有）

## 行为准则

请遵循以下原则：

- 尊重所有参与者
- 保持友好和专业的态度
- 接受建设性的反馈
- 专注于对项目最有利的事情

感谢您的贡献！🎉