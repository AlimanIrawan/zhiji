import { NextRequest, NextResponse } from 'next/server';
import { FoodService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (date) {
      // 获取特定日期的食物记录
      const records = await FoodService.getFoodRecords(userId, date);
      return NextResponse.json({ success: true, data: records });
    } else {
      // 获取最近的食物记录
      const records = await FoodService.getRecentFoodRecords(userId, limit);
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
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const foodRecord = await request.json();
    
    // 验证必需字段
    if (!foodRecord.foodName || !foodRecord.nutrition) {
      return NextResponse.json({ error: '缺少必需字段' }, { status: 400 });
    }

    // 添加用户ID和时间戳
    foodRecord.userId = userId;
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