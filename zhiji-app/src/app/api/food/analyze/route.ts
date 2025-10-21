import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { log } from '@/lib/logger';

// 直接使用环境变量中的 OpenAI API 密钥
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    log.info('Food analysis API request received', { requestId });
    
    const { image, description } = await request.json();
    
    log.info('Request data parsed', {
      requestId,
      hasImage: !!image,
      hasDescription: !!description,
      descriptionLength: description?.length || 0
    });

    // 验证输入
    if (!image && !description) {
      log.warn('Invalid request - no image or description provided', { requestId });
      return NextResponse.json(
        { success: false, error: '请提供图片或描述' },
        { status: 400 }
      );
    }

    // 构建分析提示
    let messages: any[] = [
      {
        role: 'system',
        content: `你是一个专业的营养分析师。请分析用户提供的食物信息，并返回详细的营养分析结果。

请严格按照以下JSON格式返回结果：
{
  "foodName": "食物名称",
  "portion": "份量描述",
  "nutrition": {
    "calories": 数字,
    "protein": 数字,
    "carbs": 数字,
    "fat": 数字,
    "fiber": 数字,
    "sugar": 数字
  },
  "healthScore": 数字(1-100),
  "tags": ["标签1", "标签2"],
  "suggestions": "营养建议"
}

请确保所有数值都是合理的数字，不要包含单位。健康评分范围是1-100。`
      }
    ];

    // 根据输入类型构建用户消息
    if (image && description) {
      // 图片 + 描述
      log.info('Processing image + description analysis', { requestId });
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `请分析这张食物图片和描述：${description}`
          },
          {
            type: 'image_url',
            image_url: {
              url: image
            }
          }
        ]
      });
    } else if (image) {
      // 仅图片
      log.info('Processing image-only analysis', { requestId });
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请分析这张食物图片的营养成分'
          },
          {
            type: 'image_url',
            image_url: {
              url: image
            }
          }
        ]
      });
    } else {
      // 仅描述
      log.info('Processing description-only analysis', { requestId });
      messages.push({
        role: 'user',
        content: `请分析以下食物描述的营养成分：${description}`
      });
    }

    log.externalService('OpenAI', 'API call initiated', {
      requestId,
      model: 'gpt-4o',
      messageCount: messages.length,
      hasImage: !!image
    });

    // 调用 OpenAI API
    const openaiStartTime = performance.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 1000,
    });

    const openaiResponseTime = performance.now() - openaiStartTime;
    
    log.externalService('OpenAI', 'API response received', {
      requestId,
      responseTime: `${openaiResponseTime.toFixed(2)}ms`,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      log.error('OpenAI returned empty response', null, { requestId });
      throw new Error('OpenAI 返回空响应');
    }

    log.info('OpenAI response content received', {
      requestId,
      responseLength: responseText.length,
      tokensUsed: completion.usage?.total_tokens || 0
    });

    // 解析 JSON 响应
    let analysisResult;
    try {
      // 尝试提取 JSON 部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
        log.info('JSON parsing successful', { requestId });
      } else {
        throw new Error('无法从响应中提取 JSON');
      }
    } catch (parseError) {
      log.error('JSON parsing failed - AI analysis failed', parseError, { 
        requestId,
        responseText: responseText.substring(0, 200) + '...'
      });
      
      // 不使用降级分析，直接抛出错误
      throw new Error(`AI分析失败：无法解析OpenAI响应。${parseError instanceof Error ? parseError.message : '未知错误'}`);
    }

    // 验证和清理数据
    const cleanResult = {
      foodName: analysisResult.foodName || '未知食物',
      portion: analysisResult.portion || '1份',
      nutrition: {
        calories: Number(analysisResult.nutrition?.calories) || 0,
        protein: Number(analysisResult.nutrition?.protein) || 0,
        carbs: Number(analysisResult.nutrition?.carbs) || 0,
        fat: Number(analysisResult.nutrition?.fat) || 0,
        fiber: Number(analysisResult.nutrition?.fiber) || 0,
        sugar: Number(analysisResult.nutrition?.sugar) || 0,
      },
      healthScore: Math.min(100, Math.max(1, Number(analysisResult.healthScore) || 50)),
      tags: Array.isArray(analysisResult.tags) ? analysisResult.tags : ['食物'],
      suggestions: analysisResult.suggestions || '暂无建议'
    };

    const totalResponseTime = performance.now() - startTime;
    
    log.info('Food analysis completed successfully', {
      requestId,
      foodName: cleanResult.foodName,
      calories: cleanResult.nutrition.calories,
      healthScore: cleanResult.healthScore,
      totalResponseTime: `${totalResponseTime.toFixed(2)}ms`,
      openaiResponseTime: `${openaiResponseTime.toFixed(2)}ms`
    });

    return NextResponse.json({
      success: true,
      data: cleanResult
    });

  } catch (error) {
    const totalResponseTime = performance.now() - startTime;
    
    log.error('Food analysis API failed', error, {
      requestId,
      totalResponseTime: `${totalResponseTime.toFixed(2)}ms`,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // 返回错误信息
    const errorMessage = error instanceof Error ? error.message : '分析失败';
    return NextResponse.json(
      { 
        success: false, 
        error: `分析失败: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}