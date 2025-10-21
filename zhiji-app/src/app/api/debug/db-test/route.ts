import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  console.log('[DEBUG] DB Test API: 开始数据库连接测试');
  
  try {
    // 检查环境变量
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    console.log('[DEBUG] DB Test: 环境变量检查');
    console.log('[DEBUG] DB Test: KV_REST_API_URL存在:', !!kvUrl);
    console.log('[DEBUG] DB Test: KV_REST_API_TOKEN存在:', !!kvToken);
    console.log('[DEBUG] DB Test: KV_REST_API_URL值:', kvUrl?.substring(0, 50) + '...');
    
    if (!kvUrl || !kvToken) {
      console.error('[DEBUG] DB Test: 缺少必需的环境变量');
      return NextResponse.json({
        success: false,
        error: '数据库环境变量未配置',
        details: {
          hasUrl: !!kvUrl,
          hasToken: !!kvToken,
          message: '请在.env.local文件中配置KV_REST_API_URL和KV_REST_API_TOKEN'
        }
      }, { status: 500 });
    }

    // 测试基本连接
    console.log('[DEBUG] DB Test: 尝试连接到KV数据库');
    const testKey = `test:${Date.now()}`;
    const testValue = { message: 'Hello from zhiji-app', timestamp: new Date().toISOString() };
    
    // 写入测试
    console.log('[DEBUG] DB Test: 执行写入测试');
    await kv.set(testKey, testValue);
    console.log('[DEBUG] DB Test: 写入成功');
    
    // 读取测试
    console.log('[DEBUG] DB Test: 执行读取测试');
    const retrievedValue = await kv.get(testKey);
    console.log('[DEBUG] DB Test: 读取成功', retrievedValue);
    
    // 删除测试数据
    console.log('[DEBUG] DB Test: 清理测试数据');
    await kv.del(testKey);
    console.log('[DEBUG] DB Test: 清理完成');
    
    // 测试列表操作
    console.log('[DEBUG] DB Test: 测试列表操作');
    const keys = await kv.keys('*');
    console.log('[DEBUG] DB Test: 当前数据库中的键数量:', keys.length);
    
    const result = {
      success: true,
      message: '数据库连接测试成功',
      details: {
        connection: 'OK',
        writeTest: 'OK',
        readTest: 'OK',
        deleteTest: 'OK',
        existingKeysCount: keys.length,
        testData: retrievedValue,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('[DEBUG] DB Test: 测试完成', result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[DEBUG] DB Test: 数据库连接失败', error);
    
    let errorMessage = '未知错误';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5) // 只显示前5行堆栈
      };
    }
    
    return NextResponse.json({
      success: false,
      error: '数据库连接测试失败',
      details: {
        errorMessage,
        errorDetails,
        timestamp: new Date().toISOString(),
        suggestion: '请检查Vercel KV数据库配置和网络连接'
      }
    }, { status: 500 });
  }
}