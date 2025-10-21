import { NextRequest, NextResponse } from 'next/server';
import { FoodService } from '@/lib/kv';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const record = await FoodService.getFoodRecord(userId, id);

    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 检查记录是否属于当前用户
    if (record.userId !== userId) {
      return NextResponse.json({ error: '无权访问此记录' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: record });

  } catch (error) {
    console.error('Get food record error:', error);
    return NextResponse.json(
      { error: '获取食物记录失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const updates = await request.json();

    // 先获取现有记录
    const existingRecord = await FoodService.getFoodRecord(userId, id);
    if (!existingRecord) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 检查记录是否属于当前用户
    if (existingRecord.userId !== userId) {
      return NextResponse.json({ error: '无权修改此记录' }, { status: 403 });
    }

    // 更新记录
    const updatedRecord = {
      ...existingRecord,
      ...updates,
      id: id, // 确保ID不被修改
      userId: userId, // 确保用户ID不被修改
      updatedAt: new Date().toISOString(),
    };

    await FoodService.updateFoodRecord(userId, id, updatedRecord);

    return NextResponse.json({ success: true, data: updatedRecord });

  } catch (error) {
    console.error('Update food record error:', error);
    return NextResponse.json(
      { error: '更新食物记录失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    // 先获取现有记录以验证权限
    const existingRecord = await FoodService.getFoodRecord(userId, id);
    if (!existingRecord) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 检查记录是否属于当前用户
    if (existingRecord.userId !== userId) {
      return NextResponse.json({ error: '无权删除此记录' }, { status: 403 });
    }

    await FoodService.deleteFoodRecord(userId, id);

    return NextResponse.json({ success: true, message: '记录已删除' });

  } catch (error) {
    console.error('Delete food record error:', error);
    return NextResponse.json(
      { error: '删除食物记录失败' },
      { status: 500 }
    );
  }
}