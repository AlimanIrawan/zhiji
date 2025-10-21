'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import { FoodRecord } from '@/types';

interface AnalysisResult {
  foodName: string;
  portion: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  healthScore: number;
  tags: string[];
  suggestions: string;
}

export default function FoodPage() {
  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 新增状态
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('[DEBUG] FoodPage: 组件已挂载，开始加载数据');
    loadFoodRecords();
  }, []);

  const loadFoodRecords = async () => {
    try {
      console.log('[DEBUG] FoodPage: 开始获取食物记录');
      const response = await fetch('/api/food/records');
      console.log('[DEBUG] FoodPage: API响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[DEBUG] FoodPage: 获取到的数据:', data);
      
      if (data.success) {
        setRecords(data.data || []);
        console.log('[DEBUG] FoodPage: 成功设置记录数量:', data.data?.length || 0);
      } else {
        throw new Error(data.error || '获取数据失败');
      }
    } catch (error) {
      console.error('[ERROR] FoodPage: 加载食物记录失败:', error);
      setError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setIsLoading(false);
      console.log('[DEBUG] FoodPage: 数据加载完成');
    }
  };

  // 处理图片选择
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 清除图片
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 分析食物
  const analyzeFood = async () => {
    if (!selectedImage && !description.trim()) {
      setError('请上传图片或输入描述');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      let imageBase64 = null;
      if (selectedImage) {
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(selectedImage);
        });
      }

      const response = await fetch('/api/food/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`分析失败: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setAnalysisResult(result.data);
      } else {
        throw new Error(result.error || '分析失败');
      }
    } catch (error) {
      console.error('[ERROR] 食物分析失败:', error);
      setError(error instanceof Error ? error.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 保存分析结果
  const saveAnalysisResult = async () => {
    if (!analysisResult) return;

    try {
      const response = await fetch('/api/food/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: analysisResult.foodName,
          nutrition: analysisResult.nutrition,
          tags: analysisResult.tags,
          healthScore: analysisResult.healthScore,
          suggestions: analysisResult.suggestions,
        }),
      });

      if (response.ok) {
        // 重新加载记录
        await loadFoodRecords();
        // 重置表单
        resetForm();
        setShowAddForm(false);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败');
    }
  };

  // 重置表单
  const resetForm = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setDescription('');
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16 pb-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">饮食记录</h1>
              <p className="text-gray-600 mt-1">AI智能分析您的饮食营养</p>
            </div>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary-700"
            >
              <Camera className="h-5 w-5 mr-2" />
              {showAddForm ? '取消' : '添加记录'}
            </button>
          </div>

          {/* 添加记录表单 */}
          {showAddForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">添加新的饮食记录</h2>
              
              {/* 图片上传区域 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  拍照或选择图片（可选）
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="预览" 
                        className="max-w-full max-h-64 mx-auto rounded-lg"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <button
                        onClick={triggerFileSelect}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        点击选择图片
                      </button>
                      <p className="text-gray-500 text-sm mt-2">支持 JPG、PNG 格式</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* 描述输入框 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  食物描述（可选）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述您吃的食物，例如：一碗白米饭，一份宫保鸡丁..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* 分析按钮 */}
              <div className="mb-6">
                <button
                  onClick={analyzeFood}
                  disabled={isAnalyzing || (!selectedImage && !description.trim())}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      AI分析中...
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      AI智能分析
                    </>
                  )}
                </button>
              </div>

              {/* 错误信息 */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {/* 分析结果 */}
              {analysisResult && (
                <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="text-lg font-semibold text-green-800">分析完成</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">基本信息</h4>
                      <p><span className="text-gray-600">食物：</span>{analysisResult.foodName}</p>
                      <p><span className="text-gray-600">份量：</span>{analysisResult.portion}</p>
                      <p><span className="text-gray-600">健康评分：</span>{analysisResult.healthScore}/10</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">营养成分</h4>
                      <p><span className="text-gray-600">卡路里：</span>{analysisResult.nutrition.calories} kcal</p>
                      <p><span className="text-gray-600">蛋白质：</span>{analysisResult.nutrition.protein}g</p>
                      <p><span className="text-gray-600">碳水：</span>{analysisResult.nutrition.carbs}g</p>
                      <p><span className="text-gray-600">脂肪：</span>{analysisResult.nutrition.fat}g</p>
                    </div>
                  </div>
                  
                  {analysisResult.suggestions && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">营养建议</h4>
                      <p className="text-gray-700">{analysisResult.suggestions}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={saveAnalysisResult}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                  >
                    保存记录
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Records List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {records.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有饮食记录</h3>
                <p className="text-gray-600 mb-6">开始记录您的第一餐吧！</p>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
                >
                  添加第一条记录
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {records.map((record) => (
                  <div key={record.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                          <Camera className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{record.description}</h3>
                          <p className="text-sm text-gray-600">
                            {record.recordDate} {record.recordTime}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {record.nutrition.calories} 卡路里
                        </p>
                        <p className="text-sm text-gray-600">
                          蛋白质 {record.nutrition.protein}g
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}