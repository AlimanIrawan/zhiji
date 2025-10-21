import { NextRequest, NextResponse } from 'next/server';
import { GarminService } from '@/lib/kv';
import { garminService } from '@/lib/garmin-service';

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] API: 开始 Garmin 数据同步...');
    
    // 检查是否配置了 Garmin 账号
    if (!garminService.isConfigured()) {
      console.error('[ERROR] API: 未配置 Garmin 账号信息');
      return NextResponse.json({ 
        error: '未配置 Garmin 账号信息，请在环境变量中设置 GARMIN_EMAIL 和 GARMIN_PASSWORD' 
      }, { status: 400 });
    }

    // 从请求中获取日期参数（可选）
    const body = await request.json().catch(() => ({}));
    const date = body.date;

    // 使用 Garmin Connect 服务同步数据
    const garminData = await garminService.syncData(date);
    console.log('[DEBUG] API: Garmin 数据同步成功:', garminData);

    // 保存到 KV 存储
    await GarminService.saveGarminData(garminData);
    console.log('[DEBUG] API: 数据已保存到 KV 存储');

    return NextResponse.json({
      success: true,
      data: garminData,
      message: 'Garmin数据同步成功',
    });

  } catch (error) {
    console.error('[ERROR] API: Garmin sync error:', error);
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = 'Garmin数据同步失败';
    if (error instanceof Error) {
      if (error.message.includes('登录失败')) {
        errorMessage = 'Garmin 账号登录失败，请检查账号密码是否正确';
      } else if (error.message.includes('未配置')) {
        errorMessage = '未配置 Garmin 账号信息';
      } else {
        errorMessage = `同步失败: ${error.message}`;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '7');

    if (date) {
      // 获取特定日期的数据
      const data = await GarminService.getGarminData(userId, date);
      return NextResponse.json({ success: true, data });
    } else {
      // 获取最近的数据
      const data = await GarminService.getRecentGarminData(userId, limit);
      return NextResponse.json({ success: true, data });
    }

  } catch (error) {
    console.error('Get Garmin data error:', error);
    return NextResponse.json(
      { error: '获取Garmin数据失败' },
      { status: 500 }
    );
  }
}