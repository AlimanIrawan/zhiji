import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    console.log('GET /api/user/profile - userId:', userId);

    const profile = await UserService.getProfile(userId);

    if (!profile) {
      console.log('User profile not found for userId:', userId);
      return NextResponse.json({ error: '用户资料不存在' }, { status: 404 });
    }

    console.log('Successfully retrieved user profile');
    return NextResponse.json({ success: true, data: profile });

  } catch (error) {
    console.error('Get user profile error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: '获取用户资料失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const updates = await request.json();
    
    console.log('PUT /api/user/profile - updates:', Object.keys(updates));

    // 获取现有资料
    const existingProfile = await UserService.getProfile(userId);
    if (!existingProfile) {
      console.log('User profile not found for update, userId:', userId);
      return NextResponse.json({ error: '用户资料不存在' }, { status: 404 });
    }

    // 更新资料
    const updatedProfile = {
      ...existingProfile,
      ...updates,
      id: userId, // 确保ID不被修改
      updatedAt: new Date().toISOString(),
    };

    const success = await UserService.updateProfile(userId, updates);
    
    if (!success) {
      throw new Error('Failed to update user profile');
    }

    console.log('Successfully updated user profile');
    return NextResponse.json({ success: true, data: updatedProfile });

  } catch (error) {
    console.error('Update user profile error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: '更新用户资料失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}