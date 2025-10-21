import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const userService = new UserService();
    const profile = await userService.getUserProfile(session.user.id);

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const updates = await request.json();
    const userService = new UserService();

    // 获取现有资料
    const existingProfile = await userService.getUserProfile(session.user.id);
    if (!existingProfile) {
      return NextResponse.json({ error: '用户资料不存在' }, { status: 404 });
    }

    // 更新资料
    const updatedProfile = {
      ...existingProfile,
      ...updates,
      id: session.user.id, // 确保ID不被修改
      updatedAt: new Date().toISOString(),
    };

    await userService.updateUserProfile(session.user.id, updatedProfile);

    return NextResponse.json({ success: true, data: updatedProfile });

  } catch (error) {
    console.error('Update user profile error:', error);
    return NextResponse.json(
      { error: '更新用户资料失败' },
      { status: 500 }
    );
  }
}