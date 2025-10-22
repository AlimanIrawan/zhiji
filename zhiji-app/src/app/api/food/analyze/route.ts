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
        content: `你是一个专业的营养分析师，具备精确的图像识别和营养计算能力。

**分析优先级：**
1. 如果有图片：以图片为主要分析对象，文字描述作为辅助说明（如"图片中的菜没有全部吃完"等情况说明）
2. 如果只有图片：分析图片中的所有食物
3. 如果只有文字：根据文字描述进行营养估算

**餐具分量参考（仅作参考，不强制要求图片中必须有餐具）：**
- 筷子：长度约23-25cm
- 勺子：长度约15-18cm（汤勺），12-15cm（饭勺）  
- 叉子：长度约18-20cm
- 刀子：长度约20-25cm

**分量判断方法：**
1. 优先使用筷子、勺子、叉子、刀子等固定尺寸餐具作为参考
2. 注意透视角度对餐具和食物尺寸的影响
3. 如果没有餐具，根据食物本身的常见尺寸进行估算
4. 自主判断食物分量，无需特殊考虑

**健康评分标准 (1-100分)：**
- 90-100分：营养均衡，低热量，高纤维，富含优质蛋白质和维生素
- 80-89分：营养较好，热量适中，营养成分比较均衡
- 70-79分：营养一般，可能缺少某些营养成分或热量偏高
- 60-69分：营养不均衡，高热量或缺乏重要营养成分
- 50-59分：营养价值较低，高油高糖或营养单一
- 40-49分：不健康食物，高热量高脂肪，营养价值很低
- 30-39分：垃圾食品，对健康有害
- 1-29分：极不健康，强烈不推荐食用

请严格按照以下JSON格式返回结果，不要添加任何其他文字：
{
  "nutrition": {
    "calories": 数字,
    "protein": 数字,
    "carbs": 数字,
    "fat": 数字,
    "fiber": 数字,
    "healthScore": 数字(1-100)
  }
}`
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
      temperature: 0.1, // 降低随机性，确保更一致的JSON输出
      response_format: { type: "json_object" } // 强制JSON格式输出
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
      // 由于使用了response_format: json_object，响应应该直接是JSON
      analysisResult = JSON.parse(responseText);
      log.info('JSON parsing successful', { requestId });
    } catch (parseError) {
      log.error('JSON parsing failed - AI analysis failed', parseError, { 
        requestId,
        responseText: responseText.substring(0, 500) // 增加日志长度以便调试
      });
      
      // 尝试提取JSON部分作为备用方案
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
          log.info('JSON extraction successful as fallback', { requestId });
        } else {
          throw new Error('无法从响应中提取 JSON');
        }
      } catch (fallbackError) {
        log.error('Fallback JSON extraction also failed', fallbackError, { 
          requestId,
          responseText: responseText
        });
        throw new Error(`AI分析失败：OpenAI返回了非JSON格式的响应。响应内容：${responseText.substring(0, 200)}`);
      }
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