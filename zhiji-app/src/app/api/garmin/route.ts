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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const action = body.action;
    
    // 后端服务URL - 部署后需要更新为实际的Render URL
    const backendUrl = process.env.GARMIN_BACKEND_URL || 'http://localhost:5001';
    
    // 根据action确定具体的端点
    let endpoint = '';
    switch (action) {
      case 'login':
        endpoint = '/api/garmin/login';
        break;
      case 'sync':
        endpoint = '/api/garmin/sync';
        break;
      case 'user_info':
        endpoint = '/api/garmin/user-info';
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
    
    try {
      console.log(`Forwarding request to: ${backendUrl}${endpoint}`);
      
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      const result = await response.json();
      return NextResponse.json(result);
      
    } catch (fetchError: any) {
      console.error('Failed to call backend service:', fetchError);
      return NextResponse.json({
        success: false,
        error: `Failed to call backend service: ${fetchError.message}`
      }, { status: 500 });
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