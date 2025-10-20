/**
 * 应用配置文件
 * 根据环境自动切换API地址
 */

// 检测当前环境
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// API配置
const API_CONFIG = {
  // 后端API地址
  baseURL: isLocalhost 
    ? 'http://localhost:5001'  // 本地开发（5000端口被系统占用，改用5001）
    : 'https://zhiji.onrender.com',  // 生产环境
  
  // 超时设置
  timeout: 30000,
  
  // 默认用户ID（多用户时需要登录系统）
  defaultUserId: 'default_user'
};

// API端点
const API_ENDPOINTS = {
  // 健康检查
  health: '/health',
  
  // 饮食记录
  analyzeFood: '/api/analyze-food',
  saveRecord: '/api/records',
  getRecords: '/api/records',
  deleteRecord: (id) => `/api/records/${id}`,
  
  // Garmin同步
  syncGarmin: '/api/garmin/sync',
  testGarmin: '/api/garmin/test',
  
  // 每日汇总
  getSummary: '/api/summary',
  getSummaryRange: '/api/summary/range',
  
  // 用户配置
  userProfile: '/api/user/profile'
};

// 导出配置
window.APP_CONFIG = API_CONFIG;
window.API_ENDPOINTS = API_ENDPOINTS;

