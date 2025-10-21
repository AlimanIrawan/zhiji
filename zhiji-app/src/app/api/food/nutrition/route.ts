import { NextRequest, NextResponse } from 'next/server';
import { FoodService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ error: '请提供日期参数' }, { status: 400 });
    }

    const dailyNutrition = await FoodService.calculateDailyNutrition(userId, date);

    return NextResponse.json({ success: true, data: dailyNutrition });

  } catch (error) {
    console.error('Get daily nutrition error:', error);
    return NextResponse.json(
      { error: '获取每日营养数据失败' },
      { status: 500 }
    );
  }
}