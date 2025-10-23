import { NextRequest, NextResponse } from 'next/server';

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
    
    // 检查是否在生产环境
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // 生产环境：转发请求到Python Serverless Function
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'https://zhiji-app.vercel.app';
      
      try {
        const response = await fetch(`${baseUrl}/api/garmin.py`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        });

        const result = await response.json();
        return NextResponse.json(result);
      } catch (fetchError) {
        console.error('Failed to call Python function:', fetchError);
        return NextResponse.json({
          success: false,
          error: 'Failed to call Python function'
        }, { status: 500 });
      }
    } else {
      // 开发环境：使用spawn调用本地Python脚本
      const { spawn } = require('child_process');
      const path = require('path');
      
      const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python3');
      const pythonScript = path.join(process.cwd(), 'api', 'garmin.py');

      return new Promise((resolve) => {
        const python = spawn(pythonPath, [pythonScript], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        python.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        python.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        python.on('close', (code: number | null) => {
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
        python.stdin.write(JSON.stringify(body));
        python.stdin.end();
      });
    }

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