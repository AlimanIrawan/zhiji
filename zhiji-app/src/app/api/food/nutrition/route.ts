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
    
    if (!date) {
      return NextResponse.json({ error: '请提供日期参数' }, { status: 400 });
    }

    const foodService = new FoodService();
    const dailyNutrition = await foodService.getDailyNutrition(session.user.id, date);

    return NextResponse.json({ success: true, data: dailyNutrition });

  } catch (error) {
    console.error('Get daily nutrition error:', error);
    return NextResponse.json(
      { error: '获取每日营养数据失败' },
      { status: 500 }
    );
  }
}