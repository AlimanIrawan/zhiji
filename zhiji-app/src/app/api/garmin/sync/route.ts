import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[API] Garmin同步请求开始');
  
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const days = searchParams.get('days') || '1';
    const force = searchParams.get('force') || 'false';
    
    console.log('[API] 请求参数 - 日期:', date, '天数:', days, '强制同步:', force);
    console.log('[API] 准备调用后端服务...');
    
    // 调用后端API
    const backendUrl = `http://localhost:5001/api/garmin/sync?date=${date}&days=${days}&force=${force}`;
    console.log('[API] 后端URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[API] 后端响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] 后端错误响应:', errorText);
      return NextResponse.json(
        { 
          error: '后端服务错误', 
          details: `HTTP ${response.status}: ${response.statusText}`,
          backendError: errorText
        }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[API] 后端返回数据结构:', Object.keys(data));
    console.log('[API] 数据获取成功');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Garmin同步失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorDetails = {
      message: errorMessage,
      timestamp: new Date().toISOString(),
      endpoint: '/api/garmin/sync'
    };
    
    console.error('[API] 错误详情:', errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Garmin数据同步失败', 
        details: errorDetails
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}