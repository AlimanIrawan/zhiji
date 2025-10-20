/**
 * 测试 API 路由
 * 用于验证 Vercel 是否能正确识别 API 路由
 */

module.exports = async function handler(req, res) {
  console.log('🧪 ===== 测试 API 被调用 =====');
  console.log('📅 时间:', new Date().toISOString());
  console.log('🌐 请求方法:', req.method);
  console.log('🔗 请求URL:', req.url);
  console.log('📋 请求头:', JSON.stringify(req.headers, null, 2));
  console.log('🔧 环境变量:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - VERCEL:', process.env.VERCEL);
  console.log('  - VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('✅ ===== 测试 API 处理完成 =====');
  
  return res.status(200).json({
    success: true,
    message: '测试 API 工作正常',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};
