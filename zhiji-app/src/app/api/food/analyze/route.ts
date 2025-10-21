import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 直接使用环境变量中的 OpenAI API 密钥
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image, description } = await request.json();

    // 验证输入
    if (!image && !description) {
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
  "healthScore": 数字(1-10),
  "tags": ["标签1", "标签2"],
  "suggestions": "营养建议"
}

请确保所有数值都是合理的数字，不要包含单位。`
      }
    ];

    // 根据输入类型构建用户消息
    if (image && description) {
      // 图片 + 描述
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
      messages.push({
        role: 'user',
        content: `请分析以下食物描述的营养成分：${description}`
      });
    }

    console.log('[DEBUG] 发送到 OpenAI 的消息:', JSON.stringify(messages, null, 2));

    // 调用 OpenAI API
    const completion = await openai.chat.completions.create({
      model: image ? 'gpt-4-vision-preview' : 'gpt-4',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content;
    console.log('[DEBUG] OpenAI 响应:', responseText);

    if (!responseText) {
      throw new Error('OpenAI 返回空响应');
    }

    // 解析 JSON 响应
    let analysisResult;
    try {
      // 尝试提取 JSON 部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法从响应中提取 JSON');
      }
    } catch (parseError) {
      console.error('[ERROR] JSON 解析失败:', parseError);
      // 如果解析失败，返回默认结果
      analysisResult = {
        foodName: description || '未知食物',
        portion: '1份',
        nutrition: {
          calories: 200,
          protein: 10,
          carbs: 30,
          fat: 8,
          fiber: 3,
          sugar: 5
        },
        healthScore: 6,
        tags: ['普通食物'],
        suggestions: '建议搭配蔬菜和水果，保持营养均衡。'
      };
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
      healthScore: Math.min(10, Math.max(1, Number(analysisResult.healthScore) || 5)),
      tags: Array.isArray(analysisResult.tags) ? analysisResult.tags : ['食物'],
      suggestions: analysisResult.suggestions || '暂无建议'
    };

    console.log('[DEBUG] 清理后的结果:', cleanResult);

    return NextResponse.json({
      success: true,
      data: cleanResult
    });

  } catch (error) {
    console.error('[ERROR] 食物分析失败:', error);
    
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