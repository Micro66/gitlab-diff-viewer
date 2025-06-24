// GitLab Diff Viewer 调试工具
// 用于排查API调用问题

class GitLabDebugger {
  constructor(gitlabUrl, token) {
    this.gitlabUrl = gitlabUrl;
    this.token = token;
    this.baseApi = `${gitlabUrl}/api/v4`;
  }

  // 测试Token有效性
  async testToken() {
    try {
      const response = await fetch(`${this.baseApi}/user`, {
        headers: { 'PRIVATE-TOKEN': this.token }
      });
      
      if (response.ok) {
        const user = await response.json();
        console.log('✅ Token有效:', user.name, user.username);
        return { success: true, user };
      } else {
        console.log('❌ Token无效:', response.status, response.statusText);
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('Token测试失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 搜索项目
  async searchProject(projectPath) {
    try {
      // 尝试直接获取项目信息
      const encodedPath = projectPath.replaceAll('/', '%2F');
      const response = await fetch(`${this.baseApi}/projects/${encodedPath}`, {
        headers: { 'PRIVATE-TOKEN': this.token }
      });
      
      if (response.ok) {
        const project = await response.json();
        console.log('✅ 项目存在:', project.name, project.path_with_namespace);
        return { success: true, project };
      } else {
        console.log('❌ 项目不存在或无权限:', response.status);
        
        // 尝试搜索项目
        const searchResponse = await fetch(`${this.baseApi}/projects?search=${encodeURIComponent(projectPath.split('/').pop())}`, {
          headers: { 'PRIVATE-TOKEN': this.token }
        });
        
        if (searchResponse.ok) {
          const projects = await searchResponse.json();
          const matchingProjects = projects.filter(p => 
            p.path_with_namespace.includes(projectPath) || 
            p.path_with_namespace.toLowerCase().includes(projectPath.toLowerCase())
          );
          
          if (matchingProjects.length > 0) {
            console.log('🔍 找到相似项目:');
            matchingProjects.forEach(p => {
              console.log(`  - ${p.path_with_namespace} (ID: ${p.id})`);
            });
            return { success: false, suggestions: matchingProjects };
          }
        }
        
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('项目搜索失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 检查MR是否存在
  async checkMR(projectPath, mrId) {
    try {
      const encodedPath = projectPath.replaceAll('/', '%2F');
      const response = await fetch(`${this.baseApi}/projects/${encodedPath}/merge_requests/${mrId}`, {
        headers: { 'PRIVATE-TOKEN': this.token }
      });
      
      if (response.ok) {
        const mr = await response.json();
        console.log('✅ MR存在:', mr.title, mr.state);
        return { success: true, mr };
      } else {
        console.log('❌ MR不存在:', response.status);
        
        // 尝试获取项目的MR列表
        const listResponse = await fetch(`${this.baseApi}/projects/${encodedPath}/merge_requests?per_page=10`, {
          headers: { 'PRIVATE-TOKEN': this.token }
        });
        
        if (listResponse.ok) {
          const mrs = await listResponse.json();
          console.log('📋 项目最近的MR:');
          mrs.slice(0, 5).forEach(mr => {
            console.log(`  - MR !${mr.iid}: ${mr.title} (${mr.state})`);
          });
          return { success: false, recentMRs: mrs.slice(0, 5) };
        }
        
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('MR检查失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 完整诊断
  async diagnose(projectPath, mrId) {
    console.log('🔍 开始诊断...');
    console.log('项目路径:', projectPath);
    console.log('MR ID:', mrId);
    console.log('GitLab URL:', this.gitlabUrl);
    
    const results = {
      token: await this.testToken(),
      project: await this.searchProject(projectPath),
      mr: null
    };
    
    // 只有项目存在时才检查MR
    if (results.project.success) {
      results.mr = await this.checkMR(projectPath, mrId);
    }
    
    console.log('🎯 诊断结果:', results);
    return results;
  }
}

// 导出调试器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitLabDebugger;
} else {
  window.GitLabDebugger = GitLabDebugger;
}