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
      id: uuidv4(),
      userId: session.user.id,
      date: garminData.date || new Date().toISOString().split('T')[0],
      steps: garminData.steps || 0,
      distance: garminData.distance || 0,
      calories: garminData.calories || 0,
      activeMinutes: garminData.activeMinutes || 0,
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
      sleep: garminData.sleep || {
        totalSleep: 0,
        deepSleep: 0,
        lightSleep: 0,
        remSleep: 0,
        awake: 0,
        sleepScore: 0,
      },
      stress: garminData.stress || {
        average: 0,
        max: 0,
        restPeriods: 0,
        stressPeriods: 0,
      },
      timestamp: new Date().toISOString(),
    };

    const garminService = new GarminService();
    await garminService.saveGarminData(processedData);

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

    const garminService = new GarminService();
    
    if (date) {
      // 获取特定日期的数据
      const data = await garminService.getGarminDataByDate(session.user.id, date);
      return NextResponse.json({ success: true, data });
    } else {
      // 获取最近的数据
      const data = await garminService.getRecentGarminData(session.user.id, limit);
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