import { NextRequest, NextResponse } from 'next/server';
import { garminService } from '@/lib/garmin-service';
import { GarminService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  console.log('[API] Garmin同步请求开始');
  
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const days = parseInt(searchParams.get('days') || '1');
    const force = searchParams.get('force') === 'true';
    
    console.log('[API] 请求参数 - 日期:', date, '天数:', days, '强制同步:', force);
    
    const userId = 'personal-user'; // 个人应用使用固定用户ID
    const results = [];
    
    // 如果是多天同步，处理每一天
    if (days > 1) {
      const startDate = new Date(date);
      
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() - i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        console.log(`[API] 处理日期: ${dateStr}`);
        
        // 检查是否已有数据且不强制同步
        let existingData = null;
        if (!force) {
          existingData = await GarminService.getGarminData(userId, dateStr);
        }
        
        if (existingData && !force) {
          console.log(`[API] 使用已有数据: ${dateStr}`);
          results.push(existingData);
        } else {
          try {
            // 从Garmin同步新数据
            console.log(`[API] 从Garmin同步数据: ${dateStr}`);
            const garminData = await garminService.syncData(dateStr);
            
            // 保存到存储
            const saved = await GarminService.saveGarminData(garminData);
            if (saved) {
              results.push(garminData);
              console.log(`[API] 数据保存成功: ${dateStr}`);
            } else {
              console.error(`[API] 数据保存失败: ${dateStr}`);
            }
          } catch (syncError) {
            console.error(`[API] 同步失败 ${dateStr}:`, syncError);
            // 如果同步失败，尝试获取已有数据
            const fallbackData = await GarminService.getGarminData(userId, dateStr);
            if (fallbackData) {
              results.push(fallbackData);
            }
          }
        }
      }
    } else {
      // 单天同步
      let existingData = null;
      if (!force) {
        existingData = await GarminService.getGarminData(userId, date);
      }
      
      if (existingData && !force) {
        console.log(`[API] 使用已有数据: ${date}`);
        results.push(existingData);
      } else {
        try {
          console.log(`[API] 从Garmin同步数据: ${date}`);
          const garminData = await garminService.syncData(date);
          
          const saved = await GarminService.saveGarminData(garminData);
          if (saved) {
            results.push(garminData);
            console.log(`[API] 数据保存成功: ${date}`);
          }
        } catch (syncError) {
          console.error(`[API] 同步失败:`, syncError);
          throw syncError;
        }
      }
    }
    
    console.log(`[API] 同步完成，共获取 ${results.length} 天数据`);
    
    return NextResponse.json({
      success: true,
      data: results,
      last_sync: new Date().toISOString(),
      message: `成功同步 ${results.length} 天数据`
    });
    
  } catch (error) {
    console.error('[API] Garmin同步失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorDetails = {
      message: errorMessage,
      timestamp: new Date().toISOString(),
      endpoint: '/api/garmin/sync'
    };
    
    console.error('[API] 错误详情:', errorDetails);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Garmin数据同步失败', 
        details: errorDetails
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}