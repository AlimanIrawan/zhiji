import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { FoodService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (date) {
      // 获取特定日期的食物记录
      const records = await FoodService.getFoodRecords(session.user.id, date);
      return NextResponse.json({ success: true, data: records });
    } else {
      // 获取最近的食物记录
      const records = await FoodService.getRecentFoodRecords(session.user.id, limit);
      return NextResponse.json({ success: true, data: records });
    }

  } catch (error) {
    console.error('Get food records error:', error);
    return NextResponse.json(
      { error: '获取食物记录失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const foodRecord = await request.json();
    
    // 验证必需字段
    if (!foodRecord.foodName || !foodRecord.nutrition) {
      return NextResponse.json({ error: '缺少必需字段' }, { status: 400 });
    }

    // 添加用户ID和时间戳
    foodRecord.userId = session.user.id;
    foodRecord.timestamp = new Date().toISOString();

    await FoodService.saveFoodRecord(foodRecord);

    return NextResponse.json({ success: true, data: foodRecord });

  } catch (error) {
    console.error('Save food record error:', error);
    return NextResponse.json(
      { error: '保存食物记录失败' },
      { status: 500 }
    );
  }
}