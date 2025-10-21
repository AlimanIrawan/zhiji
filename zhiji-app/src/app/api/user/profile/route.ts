import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const profile = await UserService.getProfile(userId);

    if (!profile) {
      return NextResponse.json({ error: '用户资料不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: '获取用户资料失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const updates = await request.json();

    // 获取现有资料
    const existingProfile = await UserService.getProfile(userId);
    if (!existingProfile) {
      return NextResponse.json({ error: '用户资料不存在' }, { status: 404 });
    }

    // 更新资料
    const updatedProfile = {
      ...existingProfile,
      ...updates,
      id: userId, // 确保ID不被修改
      updatedAt: new Date().toISOString(),
    };

    await UserService.updateProfile(userId, updates);

    return NextResponse.json({ success: true, data: updatedProfile });

  } catch (error) {
    console.error('Update user profile error:', error);
    return NextResponse.json(
      { error: '更新用户资料失败' },
      { status: 500 }
    );
  }
}