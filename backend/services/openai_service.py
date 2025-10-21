"""
OpenAI食物识别服务
使用GPT-4 Vision API分析食物图片和描述
"""
import os
import logging
import base64
from openai import OpenAI

logger = logging.getLogger(__name__)

class OpenAIService:
    """OpenAI服务类"""
    
    def __init__(self):
        """初始化OpenAI客户端"""
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key or api_key.startswith('sk-xxxx'):
            logger.error("未配置OPENAI_API_KEY")
            self.client = None
        else:
            try:
                self.client = OpenAI(api_key=api_key)
                logger.info("OpenAI客户端初始化完成")
            except Exception as e:
                logger.error(f"OpenAI客户端初始化失败: {e}")
                self.client = None
    
    def is_configured(self):
        """检查是否已配置"""
        return self.client is not None
    
    def analyze_food(self, image_base64=None, description=""):
        """
        分析食物营养成分
        
        参数：
            image_base64: base64编码的图片（可选）
            description: 食物描述（可选）
        
        返回：
            {
                'calories': int,
                'protein': float,
                'carbs': float,
                'fat': float,
                'advice': str
            }
        """
        # 检查API是否配置
        if not self.client:
            raise Exception("未配置OpenAI API Key，请在环境变量中设置 OPENAI_API_KEY")
        
        # 检查输入
        if not image_base64 and not description:
            raise Exception("请提供食物图片或描述")
        
        try:
            # 记录输入参数
            logger.info(f"OpenAI分析请求 - 图片: {'有' if image_base64 else '无'}, 描述: '{description}'")
            if image_base64:
                logger.info(f"图片数据长度: {len(image_base64)} 字符")
                logger.info(f"图片数据前100字符: {image_base64[:100]}...")
            
            # 构建提示词
            prompt = self._build_prompt(description)
            
            # 准备消息内容
            messages = [
                {
                    "role": "system",
                    "content": """你是一个专业的营养师AI助手。分析用户提供的食物图片和描述，返回详细的营养成分估算。

分析优先级：
1. 如果有图片，主要分析图片中的食物，描述仅作为补充信息
2. 如果只有描述没有图片，按描述分析
3. 如果只有图片没有描述，完全按图片分析

请仔细观察食物的：
1. 种类和配料
2. 份量大小
3. 烹饪方式（油炸、清蒸等会影响热量）
4. 食材新鲜度

请严格按照以下JSON格式返回结果，不要添加任何其他文字：
{
  "calories": 总热量(整数),
  "protein": 蛋白质克数(保留1位小数),
  "carbs": 碳水化合物克数(保留1位小数),
  "fat": 脂肪克数(保留1位小数),
  "advice": "根据这餐的营养成分，给出下一餐或运动的具体建议（一句话）"
}"""
                },
                {
                    "role": "user",
                    "content": []
                }
            ]
            
            # 添加文字描述
            if description:
                messages[1]["content"].append({
                    "type": "text",
                    "text": f"食物描述：{description}\n\n{prompt}"
                })
            else:
                messages[1]["content"].append({
                    "type": "text",
                    "text": prompt
                })
            
            # 添加图片（如果有）
            if image_base64:
                # 确保base64格式正确
                if not image_base64.startswith('data:image'):
                    image_base64 = f"data:image/jpeg;base64,{image_base64}"
                
                logger.info("正在添加图片到OpenAI请求中...")
                messages[1]["content"].append({
                    "type": "image_url",
                    "image_url": {
                        "url": image_base64
                    }
                })
                logger.info("图片已添加到OpenAI请求中")
            else:
                logger.info("没有图片数据，仅使用文字描述分析")
            
            logger.info("正在调用OpenAI API分析食物...")
            
            # 调用API
            response = self.client.chat.completions.create(
                model="gpt-4o",  # 使用最新的GPT-4o模型（支持视觉）
                messages=messages,
                max_completion_tokens=500,
                temperature=0.7
            )
            
            # 解析响应
            content = response.choices[0].message.content
            logger.info(f"OpenAI响应: {content}")
            
            # 尝试解析JSON
            import json
            try:
                # 尝试直接解析
                result = json.loads(content)
            except:
                # 如果不是纯JSON，尝试提取JSON部分
                result = self._extract_nutrition_from_text(content)
                if not result or result.get('calories', 0) == 0:
                    raise Exception(f"OpenAI返回的格式无法解析: {content}")
            
            # 验证结果
            result = self._validate_result(result)
            
            return result
            
        except Exception as e:
            logger.error(f"OpenAI分析失败: {str(e)}")
            raise Exception(f"AI分析失败: {str(e)}")
    
    def _build_prompt(self, description):
        """构建分析提示词"""
        return f"""请精确分析这份食物的营养成分。

分析要求：
1. 如果有图片，请仔细观察食物的份量、种类、烹饪方式
2. 如果只有描述，请根据常见份量进行合理估算
3. 考虑烹饪方式对热量的影响（如油炸会增加30-50%热量）
4. 估算要尽可能准确，接近实际营养成分

必须返回的数据：
- 总热量（kcal）：整数
- 蛋白质（克）：保留1位小数
- 碳水化合物（克）：保留1位小数
- 脂肪（克）：保留1位小数
- 饮食建议：一句话，要具体可操作（如"建议晚餐减少200kcal摄入"或"下午进行30分钟有氧运动"）

请严格按JSON格式返回，不要添加任何其他说明文字。"""
    
    def _extract_nutrition_from_text(self, text):
        """从非纯JSON响应中提取营养信息"""
        try:
            print(f"[OpenAI] 原始响应文本: {text[:200]}...")
            
            # 清理文本，移除可能的markdown标记
            cleaned_text = text.strip()
            
            # 尝试多种JSON提取方法
            import re
            import json
            
            # 方法1: 提取```json...```块
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', cleaned_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1).strip()
                print(f"[OpenAI] 提取到JSON块: {json_str}")
                return json.loads(json_str)
            
            # 方法2: 提取```...```块（没有json标记）
            code_match = re.search(r'```\s*(\{.*?\})\s*```', cleaned_text, re.DOTALL)
            if code_match:
                json_str = code_match.group(1).strip()
                print(f"[OpenAI] 提取到代码块: {json_str}")
                return json.loads(json_str)
            
            # 方法3: 提取大括号内的内容
            brace_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned_text, re.DOTALL)
            if brace_match:
                json_str = brace_match.group(0).strip()
                print(f"[OpenAI] 提取到大括号内容: {json_str}")
                return json.loads(json_str)
            
            # 方法4: 直接解析整个文本
            print(f"[OpenAI] 尝试直接解析整个文本")
            return json.loads(cleaned_text)
            
        except json.JSONDecodeError as e:
            print(f"[OpenAI] JSON解析失败: {e}")
            print(f"[OpenAI] 尝试解析的文本: {text}")
            raise Exception(f"无法解析JSON: {e}")
        except Exception as e:
            print(f"[OpenAI] 提取营养信息失败: {e}")
            raise Exception(f"提取营养信息失败: {e}")
        
        # 如果所有方法都失败，返回默认值
        result = {
            'calories': 0,
            'protein': 0,
            'carbs': 0,
            'fat': 0,
            'advice': '请注意饮食均衡。'
        }
        
        # 尝试用正则表达式提取数字（备用方法）
        import re
        calories_match = re.search(r'热量[：:]\s*(\d+)', text)
        if calories_match:
            result['calories'] = int(calories_match.group(1))
        
        protein_match = re.search(r'蛋白质[：:]\s*([\d.]+)', text)
        if protein_match:
            result['protein'] = float(protein_match.group(1))
        
        carbs_match = re.search(r'碳水[化合物]*[：:]\s*([\d.]+)', text)
        if carbs_match:
            result['carbs'] = float(carbs_match.group(1))
        
        fat_match = re.search(r'脂肪[：:]\s*([\d.]+)', text)
        if fat_match:
            result['fat'] = float(fat_match.group(1))
        
        # 提取建议
        advice_match = re.search(r'建议[：:]\s*(.+)', text)
        if advice_match:
            result['advice'] = advice_match.group(1).strip()
        
        return result
    
    def _validate_result(self, result):
        """验证和修正结果"""
        # 检查所有必需字段是否存在
        required_fields = ['calories', 'protein', 'carbs', 'fat', 'advice']
        
        for field in required_fields:
            if field not in result:
                raise Exception(f"AI返回结果缺少必需字段: {field}")
        
        # 确保数值类型正确
        try:
            result['calories'] = int(result['calories'])
            result['protein'] = round(float(result['protein']), 1)
            result['carbs'] = round(float(result['carbs']), 1)
            result['fat'] = round(float(result['fat']), 1)
            result['advice'] = str(result['advice'])
        except Exception as e:
            raise Exception(f"AI返回的数据格式错误: {e}")
        
        # 验证数值合理性
        if result['calories'] <= 0:
            raise Exception(f"AI返回的热量值异常: {result['calories']}")
        
        if result['calories'] > 5000:
            raise Exception(f"AI返回的热量值过高: {result['calories']}，请检查输入")
        
        return result

