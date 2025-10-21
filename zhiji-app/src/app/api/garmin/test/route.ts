import { NextRequest, NextResponse } from 'next/server';
import { garminService } from '@/lib/garmin-service';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] API: 开始测试 Garmin Connect 连接...');
    
    const result = await garminService.testConnection();
    
    if (result.success) {
      console.log('[DEBUG] API: Garmin 连接测试成功');
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      console.error('[ERROR] API: Garmin 连接测试失败:', result.message);
      return NextResponse.json({
        success: false,
        error: result.message,
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[ERROR] API: Garmin test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}` 
      },
      { status: 500 }
    );
  }
}