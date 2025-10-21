import { NextRequest, NextResponse } from 'next/server';
import { FoodService } from '@/lib/kv';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // 使用固定的用户ID，因为这是个人应用
    const userId = 'personal-user';

    const { image, description } = await request.json();

    if (!image && !description) {
      return NextResponse.json({ error: '请提供图片或描述' }, { status: 400 });
    }

    // 构建AI分析提示
    let prompt = `请分析以下食物并提供详细的营养信息。返回JSON格式，包含以下字段：
    {
      "foodName": "食物名称",
      "portion": "份量（如：1碗、100g等）",
      "nutrition": {
        "calories": 卡路里数值,
        "protein": 蛋白质克数,
        "carbs": 碳水化合物克数,
        "fat": 脂肪克数,
        "fiber": 纤维克数,
        "sugar": 糖分克数
      },
      "healthScore": 健康评分(1-10),
      "tags": ["标签1", "标签2"],
      "suggestions": "营养建议"
    }`;

    if (description) {
      prompt += `\n\n食物描述：${description}`;
    }

    // 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: image 
            ? [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: image } }
              ]
            : prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const analysisResult = completion.choices[0]?.message?.content;
    if (!analysisResult) {
      return NextResponse.json({ error: 'AI分析失败' }, { status: 500 });
    }

    // 解析AI返回的JSON
    let nutritionData;
    try {
      nutritionData = JSON.parse(analysisResult);
    } catch (error) {
      // 如果JSON解析失败，尝试提取关键信息
      nutritionData = {
        foodName: '未知食物',
        portion: '1份',
        nutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
        },
        healthScore: 5,
        tags: [],
        suggestions: analysisResult,
      };
    }

    // 创建食物记录
    const now = new Date();
    const foodRecord = {
      userId: userId,
      recordDate: now.toISOString().split('T')[0], // YYYY-MM-DD
      recordTime: now.toTimeString().slice(0, 5), // HH:mm
      description: description || nutritionData.foodName || '未知食物',
      nutrition: nutritionData.nutrition,
      aiAdvice: nutritionData.suggestions || '',
      imageUrl: image || undefined,
      mealType: 'snack' as const, // 默认值，前端可以修改
    };

    // 保存到数据库
    const recordId = await FoodService.saveFoodRecord(foodRecord);

    return NextResponse.json({
      success: true,
      data: {
        analysis: nutritionData,
        recordId: recordId,
      },
    });

  } catch (error) {
    console.error('Food analysis error:', error);
    return NextResponse.json(
      { error: '食物分析失败，请稍后重试' },
      { status: 500 }
    );
  }
}