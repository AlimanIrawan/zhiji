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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // 调用Python脚本
    const pythonScript = path.join(process.cwd(), 'api', 'garmin.py');
    
    return new Promise<NextResponse>((resolve, reject) => {
      const python = spawn('python3', [pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', stderr);
          resolve(NextResponse.json({
            success: false,
            error: `Python script failed with code ${code}: ${stderr}`
          }, { status: 500 }));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(NextResponse.json(result));
        } catch (parseError) {
          console.error('Failed to parse Python output:', stdout);
          resolve(NextResponse.json({
            success: false,
            error: 'Failed to parse Python script output'
          }, { status: 500 }));
        }
      });
      
      // 发送请求数据到Python脚本
      python.stdin.write(JSON.stringify(body));
      python.stdin.end();
      
      // 设置超时
      setTimeout(() => {
        python.kill();
        resolve(NextResponse.json({
          success: false,
          error: 'Request timeout'
        }, { status: 408 }));
      }, 30000); // 30秒超时
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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