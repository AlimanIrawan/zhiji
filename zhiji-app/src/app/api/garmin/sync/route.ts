import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GarminService } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { garminData } = await request.json();
    
    if (!garminData) {
      return NextResponse.json({ error: '缺少Garmin数据' }, { status: 400 });
    }

    // 处理Garmin数据格式
    const processedData = {
      userId: session.user.id,
      syncDate: garminData.date || new Date().toISOString().split('T')[0],
      totalCalories: garminData.calories || 0,
      activeCalories: garminData.activeCalories || 0,
      restingCalories: (garminData.calories || 0) - (garminData.activeCalories || 0),
      steps: garminData.steps || 0,
      distance: garminData.distance || 0,
      floorsClimbed: garminData.floorsClimbed || 0,
      heartRate: garminData.heartRate || {
        resting: 0,
        average: 0,
        max: 0,
        zones: {
          zone1: 0,
          zone2: 0,
          zone3: 0,
          zone4: 0,
          zone5: 0,
        },
      },
      activities: garminData.activities || [],
      trainingType: garminData.trainingType || 'none',
    };

    await GarminService.saveGarminData(processedData);

    return NextResponse.json({
      success: true,
      data: processedData,
      message: 'Garmin数据同步成功',
    });

  } catch (error) {
    console.error('Garmin sync error:', error);
    return NextResponse.json(
      { error: 'Garmin数据同步失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '7');

    if (date) {
      // 获取特定日期的数据
      const data = await GarminService.getGarminData(session.user.id, date);
      return NextResponse.json({ success: true, data });
    } else {
      // 获取最近的数据
      const data = await GarminService.getRecentGarminData(session.user.id, limit);
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