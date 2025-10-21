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

    console.log('GET /api/food/records - params:', { date, limit, offset, userId });

    if (date) {
      // 获取特定日期的食物记录
      const records = await FoodService.getFoodRecords(userId, date);
      console.log('Retrieved records for date:', date, 'count:', records.length);
      return NextResponse.json({ success: true, data: records });
    } else {
      // 获取最近的食物记录
      const records = await FoodService.getRecentFoodRecords(userId, limit);
      console.log('Retrieved recent records, count:', records.length);
      return NextResponse.json({ success: true, data: records });
    }

  } catch (error) {
    console.error('Get food records error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: '获取食物记录失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const foodRecord = await request.json();
    
    console.log('POST /api/food/records - received data:', {
      foodName: foodRecord.foodName,
      hasNutrition: !!foodRecord.nutrition,
      userId
    });
    
    // 验证必需字段
    if (!foodRecord.foodName || !foodRecord.nutrition) {
      console.error('Missing required fields:', {
        foodName: !!foodRecord.foodName,
        nutrition: !!foodRecord.nutrition
      });
      return NextResponse.json({ error: '缺少必需字段' }, { status: 400 });
    }

    // 添加用户ID和时间戳
    foodRecord.userId = userId;
    foodRecord.timestamp = new Date().toISOString();

    const recordId = await FoodService.saveFoodRecord(foodRecord);
    
    if (!recordId) {
      throw new Error('Failed to save food record - no ID returned');
    }

    console.log('Successfully saved food record with ID:', recordId);
    return NextResponse.json({ success: true, data: { ...foodRecord, id: recordId } });

  } catch (error) {
    console.error('Save food record error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: '保存食物记录失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}