import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] Auto-sync API: 开始自动同步');
    
    // 构建完整的API URL，支持服务器端调用
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // 调用同步API
    const syncResponse = await fetch(`${baseUrl}/api/garmin/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    const syncResult = await syncResponse.json();
    
    if (syncResult.success) {
      console.log('[DEBUG] Auto-sync API: 自动同步成功');
      return NextResponse.json({
        success: true,
        message: '自动同步完成',
        data: syncResult.data,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('[ERROR] Auto-sync API: 自动同步失败:', syncResult.error);
      return NextResponse.json({
        success: false,
        error: syncResult.error || '自动同步失败'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[ERROR] Auto-sync API: 自动同步异常:', error);
    return NextResponse.json({
      success: false,
      error: '自动同步服务异常'
    }, { status: 500 });
  }
}

// 支持GET请求用于健康检查
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '自动同步服务运行正常',
    timestamp: new Date().toISOString()
  });
}