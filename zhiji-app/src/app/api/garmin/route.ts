import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Garmin API is running',
    endpoints: {
      'POST /api/garmin': 'Main API endpoint',
      'actions': ['login', 'sync', 'user_info']
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    // 在生产环境中，Python脚本应该通过Vercel的Python运行时执行
    const isProduction = process.env.NODE_ENV === 'production';
    
    let pythonPath: string;
    let pythonScript: string;
    
    if (isProduction) {
      // 生产环境：使用系统Python和相对路径
      pythonPath = 'python3';
      pythonScript = path.join(process.cwd(), 'api', 'garmin.py');
    } else {
      // 开发环境：使用虚拟环境
      pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python3');
      pythonScript = path.join(process.cwd(), 'api', 'garmin.py');
    }

    return new Promise((resolve) => {
      const python = spawn(pythonPath, [pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorOutput);
          resolve(NextResponse.json({
            success: false,
            error: `Script error: ${errorOutput}`
          }, { status: 500 }));
          return;
        }

        try {
          const result = JSON.parse(output);
          resolve(NextResponse.json(result));
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Raw output:', output);
          resolve(NextResponse.json({
            success: false,
            error: 'Failed to parse Python script output'
          }, { status: 500 }));
        }
      });

      // 发送输入数据到Python脚本
      python.stdin.write(JSON.stringify({ action, ...params }));
      python.stdin.end();
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}