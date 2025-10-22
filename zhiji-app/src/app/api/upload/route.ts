import { NextResponse } from 'next/server';
import { putBinary } from '@/lib/blob';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = 'personal-user';
    if (!file) {
      return NextResponse.json({ success: false, error: '缺少文件' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${Date.now()}.${ext}`;
    const pathname = `users/${userId}/images/${dateStr}/${filename}`;
    const contentType = file.type || `image/${ext}`;

    const { url } = await putBinary(pathname, arrayBuffer, contentType);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json({ success: false, error: '上传失败' }, { status: 500 });
  }
}