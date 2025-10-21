import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    // 检查用户是否已存在
    const userKey = `auth:email:${email}`;
    const existingUser = await storage.hgetall(userKey);

    if (existingUser && existingUser.id) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      );
    }

    // 创建新用户
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    // 保存认证信息
    await storage.hset(userKey, {
      id: userId,
      email: email,
      password: hashedPassword,
      provider: 'credentials',
      createdAt: now,
    });

    // 创建用户资料
    const profileKey = `user:${userId}:profile`;
    await storage.hset(profileKey, {
      id: userId,
      email: email,
      name: name || email,
      height: 170,
      currentWeight: 70,
      targetWeight: 65,
      dailyCalorieGoal: 2000,
      activityLevel: 'moderate',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      { message: '注册成功', userId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    // 提供更详细的错误信息用于调试
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('Detailed error:', errorMessage);
    
    return NextResponse.json(
      { 
        error: '注册失败，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}