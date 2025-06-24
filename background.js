// Background script for GitLab MR Diff Viewer

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    sendResponse({success: true});
  }
});

// 扩展安装或更新时的处理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('GitLab MR Diff Viewer 已安装');
    // 首次安装时打开配置页面
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    console.log('GitLab MR Diff Viewer 已更新到版本', chrome.runtime.getManifest().version);
  }
});