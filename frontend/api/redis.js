/**
 * Vercel Redis API 路由
 * 处理前端与 Redis 的数据交互
 */

// 获取 Redis 客户端
function getRedisClient() {
  const { Redis } = require('@upstash/redis');
  
  return new Redis({
    url: process.env.REDIS_REDIS_URL,
    token: process.env.REDIS_KV_REST_API_TOKEN,
  });
}

// 获取所有饮食记录
export async function GET(request) {
  try {
    const redis = getRedisClient();
    const records = await redis.get('food_records') || [];
    
    return Response.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Redis GET 错误:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// 保存饮食记录
export async function POST(request) {
  try {
    const record = await request.json();
    const redis = getRedisClient();
    
    // 获取现有记录
    const existingRecords = await redis.get('food_records') || [];
    
    // 添加新记录
    const updatedRecords = [record, ...existingRecords];
    
    // 保存到 Redis
    await redis.set('food_records', updatedRecords);
    
    return Response.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Redis POST 错误:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// 删除饮食记录
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');
    
    if (!recordId) {
      return Response.json({
        success: false,
        error: '缺少记录ID'
      }, { status: 400 });
    }
    
    const redis = getRedisClient();
    
    // 获取现有记录
    const existingRecords = await redis.get('food_records') || [];
    
    // 删除指定记录
    const updatedRecords = existingRecords.filter(record => record.id !== recordId);
    
    // 保存到 Redis
    await redis.set('food_records', updatedRecords);
    
    return Response.json({
      success: true,
      message: '记录已删除'
    });
  } catch (error) {
    console.error('Redis DELETE 错误:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
