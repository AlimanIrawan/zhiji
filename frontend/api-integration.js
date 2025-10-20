/**
 * API集成层
 * 将现有的前端代码与真实API集成
 * 这个文件会覆盖index.html中的部分函数，使其调用真实API
 */

// 等待DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 [API Integration] ========== 初始化API集成层 ==========');
  console.log('🔍 [API Integration] window.apiClient 存在:', !!window.apiClient);
  console.log('🔍 [API Integration] window.apiClient 类型:', typeof window.apiClient);
  
  if (window.apiClient) {
    console.log('🔍 [API Integration] apiClient 方法:', Object.keys(window.apiClient));
  } else {
    console.error('🔍 [API Integration] ❌ window.apiClient 不存在！');
    console.error('🔍 [API Integration] 请检查 config.js 和 api.js 是否正确加载');
  }
  
  // 初始化检查后端健康状态
  checkBackendHealth();
  
  // 加载用户配置
  loadUserProfile();
  
  // 延迟检查Garmin同步（等待用户配置加载完成）
  setTimeout(() => {
    try {
      smartSyncGarmin();
    } catch (error) {
      console.warn('🔍 [API Integration] Garmin同步跳过:', error.message);
    }
  }, 1000);
  
  console.log('🔍 [API Integration] ========== 初始化完成 ==========');
});

/**
 * 检查后端服务健康状态
 */
async function checkBackendHealth() {
  try {
    const health = await window.apiClient.healthCheck();
    console.log('[Health] 后端服务正常:', health);
    
    // 显示服务状态
    if (!health.services.redis) {
      console.warn('[Health] Redis未连接,使用内存模式');
    }
    if (!health.services.openai) {
      console.warn('[Health] OpenAI未配置,使用降级分析');
    }
    if (!health.services.garmin) {
      console.warn('[Health] Garmin未配置,使用模拟数据');
    }
  } catch (error) {
    console.error('[Health] 后端服务连接失败:', error);
    // 不弹窗，只在控制台记录，避免影响用户体验
  }
}

/**
 * 加载用户配置
 */
async function loadUserProfile() {
  try {
    const profile = await window.apiClient.getUserProfile();
    console.log('[Profile] 用户配置加载成功:', profile);
    
    // 更新全局数据
    if (typeof window !== 'undefined' && window.appData) {
      window.appData.userProfile = profile;
    }
    
    // 更新UI
    if (typeof updateUI === 'function') {
      updateUI();
    }
  } catch (error) {
    console.error('[Profile] 加载用户配置失败:', error);
  }
}

/**
 * 智能Garmin同步
 */
async function smartSyncGarmin() {
  try {
    // 检查API客户端是否有syncGarminData方法
    if (!window.apiClient || typeof window.apiClient.syncGarminData !== 'function') {
      console.log('[Garmin] syncGarminData方法不存在，跳过同步');
      return;
    }
    
    // 检查用户是否连接了Garmin
    if (typeof window !== 'undefined' && window.appData && window.appData.userProfile) {
      if (!window.appData.userProfile.garminConnected) {
        console.log('[Garmin] 用户未连接Garmin，跳过同步');
        return;
      }
    }
    
    console.log('[Garmin] 开始智能同步...');
    
    // 显示加载提示
    if (typeof showLoadingModal === 'function') {
      showLoadingModal('正在同步Garmin数据...');
    }
    
    // 调用同步API
    const result = await window.apiClient.syncGarminData();
    
    console.log('[Garmin] 同步完成:', result);
    
    // 更新UI
    if (typeof updateUI === 'function') {
      updateUI();
    }
    
    // 隐藏加载提示
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal();
    }
    
    alert('Garmin数据同步成功');
    
  } catch (error) {
    console.error('[Garmin] 同步失败:', error);
    
    // 隐藏加载提示
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal();
    }
    
    console.warn('[Garmin] 同步失败，但不影响其他功能:', error.message);
  }
}

/**
 * 覆盖原有的AI分析函数
 */
if (typeof window !== 'undefined') {
  // 覆盖为真实API调用
  window.simulateAIAnalysis = async function(imageUrl, description) {
    console.log('🔍 [AI Analysis] ========== 开始AI分析流程 ==========');
    console.log('🔍 [AI Analysis] 输入参数:');
    console.log('🔍 [AI Analysis] - 图片:', imageUrl ? '有图片数据' : '无图片');
    console.log('🔍 [AI Analysis] - 描述:', description);
    console.log('🔍 [AI Analysis] - 图片大小:', imageUrl ? imageUrl.length + ' 字符' : '0');
    
    // 显示加载提示
    if (typeof showLoadingModal === 'function') {
      showLoadingModal('AI正在分析食物，请稍候...');
    }
    
    try {
      console.log('🔍 [AI Analysis] 正在调用 window.apiClient.analyzeFood...');
      console.log('🔍 [AI Analysis] apiClient 存在:', !!window.apiClient);
      console.log('🔍 [AI Analysis] analyzeFood 方法存在:', !!(window.apiClient && window.apiClient.analyzeFood));
      
      // 调用真实API
      const result = await window.apiClient.analyzeFood(imageUrl, description);
      
      console.log('🔍 [AI Analysis] ✅ API调用成功!');
      console.log('🔍 [AI Analysis] 返回结果:', result);
      console.log('🔍 [AI Analysis] 结果类型:', typeof result);
      console.log('🔍 [AI Analysis] 结果字段:', Object.keys(result || {}));
      
      // 隐藏加载提示
      if (typeof hideLoadingModal === 'function') {
        hideLoadingModal();
      }
      
      console.log('🔍 [AI Analysis] ========== AI分析流程完成 ==========');
      return result;
    } catch (error) {
      console.error('🔍 [AI Analysis] ❌ API调用失败!');
      console.error('🔍 [AI Analysis] 错误详情:', error);
      console.error('🔍 [AI Analysis] 错误类型:', typeof error);
      console.error('🔍 [AI Analysis] 错误消息:', error.message);
      
      // 隐藏加载提示
      if (typeof hideLoadingModal === 'function') {
        hideLoadingModal();
      }
      
      console.log('🔍 [AI Analysis] ========== AI分析流程失败 ==========');
      throw error;
    }
  };
}

/**
 * 覆盖原有的更新卡路里记录函数 - 已禁用，使用原始函数
 */
if (typeof window !== 'undefined') {
  // 禁用API版本的updateCalorieRecords，使用原始版本
  console.log('🔍 [API Integration] updateCalorieRecords API版本已禁用，使用原始版本');
}

/**
 * 覆盖保存记录函数 - 已完全禁用
 */
if (typeof window !== 'undefined') {
  // 监听保存按钮点击 - 已完全禁用，使用原始保存逻辑
  document.addEventListener('click', async function(e) {
    if (e.target.closest('#save-record')) {
      // 完全禁用API保存逻辑，使用原始保存逻辑
      console.log('🔍 [API Integration] 保存按钮被点击，但API保存逻辑已禁用');
      return;
    }
    
    // API保存逻辑已完全禁用
    console.log('🔍 [API Integration] API保存逻辑已禁用，使用原始保存逻辑');
  });
}

/**
 * 覆盖原有的删除记录函数
 */
if (typeof window !== 'undefined') {
  document.addEventListener('click', async function(e) {
    if (e.target.closest('.delete-record')) {
      const recordId = e.target.closest('.delete-record').getAttribute('data-id');
      
      if (confirm('确定要删除这条记录吗？')) {
        try {
          console.log('[Delete] 删除记录:', recordId);
          
          // 调用API删除记录
          await window.apiClient.deleteRecord(recordId);
          
          console.log('[Delete] 记录删除成功');
          
          // 更新前端数据
          if (window.appData && window.appData.foodRecords) {
            window.appData.foodRecords = window.appData.foodRecords.filter(r => r.id !== recordId);
          }
          
          // 更新UI
          if (typeof loadHistoryRecords === 'function') {
            loadHistoryRecords();
          }
          if (typeof updateDailySummary === 'function') {
            updateDailySummary();
          }
          
        } catch (error) {
          console.error('[Delete] 删除记录失败:', error);
          alert('删除失败: ' + error.message);
        }
      }
    }
  });
}

/**
 * 覆盖保存目标函数
 */
if (typeof window !== 'undefined') {
  document.addEventListener('click', async function(e) {
    if (e.target.closest('#save-goal')) {
      e.preventDefault();
      
      const targetWeight = document.getElementById('target-weight').value;
      const targetDate = document.getElementById('target-date').value;
      
      if (!targetWeight || !targetDate) {
        alert('请填写完整的目标信息');
        return;
      }
      
      try {
        console.log('[Goal] 保存目标:', { targetWeight, targetDate });
        
        // 调用API保存目标
        await window.apiClient.saveGoal({ targetWeight, targetDate });
        
        console.log('[Goal] 目标保存成功');
        
        // 更新UI
        if (typeof updateUI === 'function') {
          updateUI();
        }
        
        alert('目标保存成功');
        
      } catch (error) {
        console.error('[Profile] 保存目标失败:', error);
        alert('保存失败: ' + error.message);
      }
    }
  });
}