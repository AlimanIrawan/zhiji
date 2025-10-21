import { NextRequest, NextResponse } from 'next/server';
import { SummaryService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '7');

    if (date) {
      // 获取特定日期的总结
      const summary = await SummaryService.getDailySummary(userId, date);
      return NextResponse.json({ success: true, data: summary });
    } else {
      // 获取最近的总结
      const summaries = await SummaryService.getRecentSummaries(userId, limit);
      return NextResponse.json({ success: true, data: summaries });
    }

  } catch (error) {
    console.error('Get summary error:', error);
    return NextResponse.json(
      { error: '获取总结数据失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: '请提供日期参数' }, { status: 400 });
    }

    const summary = await SummaryService.saveDailySummary({
      userId: userId,
      summaryDate: date,
      nutrition: {
        totalCaloriesIn: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
      },
      activity: {
        totalCaloriesOut: 0,
        activeCalories: 0,
        steps: 0,
        distance: 0,
        trainingType: 'none',
      },
      balance: {
        calorieDeficit: 0,
        proteinGoalMet: false,
        stepsGoalMet: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: summary });

  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json(
      { error: '生成总结失败' },
      { status: 500 }
    );
  }
}