/**
 * Vercel Redis API 路由
 * 处理前端与 Redis 的数据交互
 */

const { Redis } = require('@upstash/redis');

// 获取 Redis 客户端
function getRedisClient() {
  return new Redis({
    url: process.env.REDIS_REDIS_URL,
    token: process.env.REDIS_KV_REST_API_TOKEN,
  });
}

module.exports = async function handler(req, res) {
  console.log('=== Redis API 被调用 ===');
  console.log('请求方法:', req.method);
  console.log('请求URL:', req.url);
  console.log('请求头:', req.headers);
  console.log('环境变量检查:');
  console.log('REDIS_REDIS_URL 存在:', !!process.env.REDIS_REDIS_URL);
  console.log('REDIS_KV_REST_API_TOKEN 存在:', !!process.env.REDIS_KV_REST_API_TOKEN);
  
  const { method } = req;
  
  try {
    console.log('开始创建 Redis 客户端...');
    const redis = getRedisClient();
    console.log('Redis 客户端创建成功');
    
    if (method === 'GET') {
      console.log('处理 GET 请求...');
      // 获取所有饮食记录
      const records = await redis.get('food_records') || [];
      console.log('获取到的记录数量:', records.length);
      
      return res.status(200).json({
        success: true,
        data: records
      });
      
    } else if (method === 'POST') {
      // 保存饮食记录
      const record = req.body;
      
      // 获取现有记录
      const existingRecords = await redis.get('food_records') || [];
      
      // 添加新记录
      const updatedRecords = [record, ...existingRecords];
      
      // 保存到 Redis
      await redis.set('food_records', updatedRecords);
      
      return res.status(200).json({
        success: true,
        data: record
      });
      
    } else if (method === 'DELETE') {
      // 删除饮食记录
      const { id: recordId } = req.query;
      
      if (!recordId) {
        return res.status(400).json({
          success: false,
          error: '缺少记录ID'
        });
      }
      
      // 获取现有记录
      const existingRecords = await redis.get('food_records') || [];
      
      // 删除指定记录
      const updatedRecords = existingRecords.filter(record => record.id !== recordId);
      
      // 保存到 Redis
      await redis.set('food_records', updatedRecords);
      
      return res.status(200).json({
        success: true,
        message: '记录已删除'
      });
      
    } else {
      return res.status(405).json({
        success: false,
        error: '方法不允许'
      });
    }
    
  } catch (error) {
    console.error('=== Redis API 错误 ===');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
