/**
 * API客户端
 * 封装所有后端API调用
 */

class APIClient {
  constructor() {
    this.baseURL = window.APP_CONFIG.baseURL;
    this.userId = window.APP_CONFIG.defaultUserId;
  }

  /**
   * 通用请求方法
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    };

    try {
      console.log(`[API] ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      if (!data.success) {
        throw new Error(data.error || '操作失败');
      }

      console.log(`[API] 响应成功:`, data);
      return data.data;

    } catch (error) {
      console.error(`[API] 请求失败:`, error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const url = `${this.baseURL}${window.API_ENDPOINTS.health}`;
      console.log(`[API] GET ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '健康检查失败');
      }

      console.log(`[API] 健康检查成功:`, data);
      return data; // 健康检查直接返回原始数据

    } catch (error) {
      console.error(`[API] 健康检查失败:`, error);
      throw error;
    }
  }

  /**
   * 分析食物营养成分
   */
  async analyzeFood(imageBase64, description) {
    console.log('🔍 [API Client] analyzeFood 被调用');
    console.log('🔍 [API Client] 图片数据:', imageBase64 ? `有图片 (${imageBase64.length} 字符)` : '无图片');
    console.log('🔍 [API Client] 描述:', description);
    console.log('🔍 [API Client] 图片前100字符:', imageBase64 ? imageBase64.substring(0, 100) + '...' : 'N/A');
    
    return await this.request(window.API_ENDPOINTS.analyzeFood, {
      method: 'POST',
      body: JSON.stringify({
        image: imageBase64,
        description: description
      })
    });
  }

  /**
   * 保存饮食记录 - 保存到 Vercel Redis
   */
  async saveRecord(record) {
    try {
      const response = await fetch('/api/redis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('保存记录失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取饮食记录 - 从 Vercel Redis 获取
   */
  async getRecords(date) {
    try {
      const response = await fetch('/api/redis');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取记录失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除饮食记录 - 从 Vercel Redis 删除
   */
  async deleteRecord(recordId, date) {
    try {
      const response = await fetch(`/api/redis?id=${recordId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('删除记录失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 测试Garmin连接
   */
  async testGarminConnection() {
    return await this.request('/api/garmin/test');
  }

  /**
   * 同步Garmin数据
   */
  async syncGarminData() {
    return await this.request('/api/garmin/sync');
  }

  /**
   * 同步Garmin数据
   */
  async syncGarmin(force = false) {
    const params = new URLSearchParams({
      user_id: this.userId,
      force: force.toString()
    });
    return await this.request(`${window.API_ENDPOINTS.syncGarmin}?${params}`);
  }

  /**
   * 获取每日汇总
   */
  async getSummary(date) {
    const params = new URLSearchParams({
      user_id: this.userId,
      date: date
    });
    return await this.request(`${window.API_ENDPOINTS.getSummary}?${params}`);
  }

  /**
   * 获取日期范围汇总
   */
  async getSummaryRange(startDate, endDate) {
    const params = new URLSearchParams({
      user_id: this.userId,
      start_date: startDate,
      end_date: endDate
    });
    return await this.request(`${window.API_ENDPOINTS.getSummaryRange}?${params}`);
  }

  /**
   * 获取用户配置
   */
  async getUserProfile() {
    const params = new URLSearchParams({
      user_id: this.userId
    });
    return await this.request(`${window.API_ENDPOINTS.userProfile}?${params}`);
  }

  /**
   * 保存用户配置
   */
  async saveUserProfile(profile) {
    const params = new URLSearchParams({
      user_id: this.userId
    });
    return await this.request(`${window.API_ENDPOINTS.userProfile}?${params}`, {
      method: 'POST',
      body: JSON.stringify(profile)
    });
  }
}

// 创建全局API客户端实例
window.apiClient = new APIClient();

