import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();
    
    // Python脚本路径 - 相对于zhiji-app目录
    const pythonScript = path.join(process.cwd(), '..', 'backend', 'garmin_script.py');
    
    return new Promise((resolve) => {
      const python = spawn('python3', [pythonScript, action, JSON.stringify(params)]);
      
      let dataString = '';
      let errorString = '';
      
      python.stdout.on('data', (data) => {
        dataString += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        errorString += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(dataString);
            resolve(NextResponse.json({ success: true, data: result }));
          } catch (e) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Failed to parse Python output' 
            }, { status: 500 }));
          }
        } else {
          resolve(NextResponse.json({ 
            success: false, 
            error: errorString || 'Python script failed' 
          }, { status: 500 }));
        }
      });
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'API request failed' 
    }, { status: 500 });
  }
}