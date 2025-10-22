'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Loader2, AlertCircle, CheckCircle, Plus, Trash2, Calendar, Info } from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import { FoodRecord } from '@/types';
import { compressImage, getRecommendedCompressOptions, formatFileSize } from '@/lib/image-utils';
import { log } from '@/lib/logger';
import ErrorBoundary from '@/components/error-boundary';

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

// 时间轴数据结构
interface TimelineDay {
  date: string;
  records: FoodRecord[];
}

export default function FoodPage() {
  const [timelineData, setTimelineData] = useState<TimelineDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [daysLoaded, setDaysLoaded] = useState(0);
  const [showHealthScoreInfo, setShowHealthScoreInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    log.info('FoodPage component mounted');
    log.info('FoodPage - Component mount start');
    loadInitialTimeline();
  }, []);

  // 加载初始时间轴数据（最近7天）
  const loadInitialTimeline = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const timeline: TimelineDay[] = [];
      const today = new Date();
      
      // 加载最近7天的数据
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const records = await loadFoodRecordsForDate(dateString);
        timeline.push({
          date: dateString,
          records: records
        });
      }
      
      setTimelineData(timeline);
      setDaysLoaded(7);
      log.info('Initial timeline loaded', { daysLoaded: 7 });
    } catch (error) {
      log.error('Failed to load initial timeline', { error });
      setError('加载时间轴数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载更多天数的数据
  const loadMoreDays = async () => {
    setIsLoadingMore(true);
    
    try {
      const timeline: TimelineDay[] = [...timelineData];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysLoaded);
      
      // 再加载7天的数据
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const records = await loadFoodRecordsForDate(dateString);
        timeline.push({
          date: dateString,
          records: records
        });
      }
      
      setTimelineData(timeline);
      setDaysLoaded(daysLoaded + 7);
      log.info('More timeline data loaded', { totalDaysLoaded: daysLoaded + 7 });
    } catch (error) {
      log.error('Failed to load more timeline data', { error });
      setError('加载更多数据失败');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 为指定日期加载食物记录
  const loadFoodRecordsForDate = async (date: string): Promise<FoodRecord[]> => {
    try {
      log.info('Loading food records for date', { date });
      log.apiRequest('GET', '/api/food/records', { date });
      
      const response = await fetch(`/api/food/records?date=${date}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return data.data || [];
      } else {
        throw new Error(data.error || '获取数据失败');
      }
    } catch (error) {
      log.error('Error loading food records for date', { error, date });
      return []; // 返回空数组而不是抛出错误，这样其他日期的数据仍能正常加载
    }
  };

  // 处理图片选择和压缩
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    log.userAction('Image file selected', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });
    
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        log.warn('Invalid file type selected', { fileType: file.type });
        setError('请选择图片文件');
        return;
      }
      
      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        log.warn('File size too large', { fileSize: file.size });
        setError('图片文件不能超过10MB');
        return;
      }
      
      try {
        log.info('开始处理图片', { 
          originalSize: formatFileSize(file.size),
          fileName: file.name 
        });

        // 获取推荐的压缩设置
        const compressOptions = getRecommendedCompressOptions(file);
        
        // 压缩图片
        const compressedFile = await compressImage(file, compressOptions);
        
        log.info('图片压缩完成', {
          originalSize: formatFileSize(file.size),
          compressedSize: formatFileSize(compressedFile.size),
          compressionRatio: ((1 - compressedFile.size / file.size) * 100).toFixed(1) + '%'
        });

        // 设置压缩后的文件
        setSelectedImage(compressedFile);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
          log.info('Image preview generated successfully');
        };
        reader.onerror = (e) => {
          log.error('Failed to read image file', e);
          setError('读取图片失败');
        };
        reader.readAsDataURL(compressedFile);
        
        setError(null);
      } catch (error) {
        log.error('图片处理失败', { error });
        setError('图片处理失败，请重试');
      }
    }
  };

  // 触发文件选择
  const triggerFileSelect = () => {
    log.userAction('Trigger file select clicked');
    fileInputRef.current?.click();
  };

  // 清除图片
  const clearImage = () => {
    log.userAction('Clear image clicked');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 分析食物
  const analyzeFood = async () => {
    const startTime = performance.now();
    
    log.userAction('Analyze food clicked', {
      hasImage: !!selectedImage,
      hasDescription: !!description.trim(),
      descriptionLength: description.trim().length
    });
    
    if (!selectedImage && !description.trim()) {
      log.warn('Analysis attempted without image or description');
      setError('请上传图片或输入描述');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      let imageBase64 = null;
      if (selectedImage) {
        log.info('Converting image to base64');
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            log.info('Image converted to base64 successfully');
            resolve(e.target?.result as string);
          };
          reader.onerror = (e) => {
            log.error('Failed to convert image to base64', e);
            reject(new Error('图片处理失败'));
          };
          reader.readAsDataURL(selectedImage);
        });
      }

      const requestData = {
        image: imageBase64,
        description: description.trim() || null,
      };
      
      log.apiRequest('POST', '/api/food/analyze', {
        hasImage: !!imageBase64,
        hasDescription: !!requestData.description,
        descriptionLength: requestData.description?.length || 0
      });

      const response = await fetch('/api/food/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseTime = performance.now() - startTime;
      
      log.apiResponse('POST', '/api/food/analyze', response.status, responseTime, {
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error(`分析失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        log.info('Food analysis completed successfully', {
          foodName: result.data?.foodName,
          calories: result.data?.nutrition?.calories,
          healthScore: result.data?.healthScore,
          responseTime: `${responseTime.toFixed(2)}ms`
        });
        setAnalysisResult(result.data);
      } else {
        throw new Error(result.error || '分析失败');
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      log.error('Food analysis failed', error, {
        responseTime: `${responseTime.toFixed(2)}ms`,
        hasImage: !!selectedImage,
        hasDescription: !!description.trim()
      });
      setError(error instanceof Error ? error.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
      log.info('FoodPage - Analysis completed', {
        totalTime: `${(performance.now() - startTime).toFixed(2)}ms`
      });
    }
  };

  // 保存分析结果
  const saveAnalysisResult = async () => {
    if (!analysisResult) {
      log.warn('Save attempted without analysis result');
      return;
    }

    const startTime = performance.now();
    
    log.userAction('Save analysis result clicked', {
      foodName: analysisResult.foodName,
      calories: analysisResult.nutrition.calories
    });

    try {
      // 如果选择了图片，先上传到 Blob，得到公开 URL
      let imageUrl: string | null = null;
      if (selectedImage) {
        const fd = new FormData();
        fd.append('file', selectedImage);
        const uploadResp = await fetch('/api/upload', { method: 'POST', body: fd });
        if (uploadResp.ok) {
          const uploadJson = await uploadResp.json();
          imageUrl = uploadJson.url || null;
          log.info('Image uploaded to Blob', { imageUrl });
        } else {
          log.warn('Image upload failed, continue saving record without image');
        }
      }

      const requestData = {
        foodName: description || analysisResult.foodName, // 使用用户描述作为食品名称
        description: description, // 保存用户描述
        nutrition: analysisResult.nutrition,
        tags: analysisResult.tags,
        healthScore: analysisResult.healthScore,
        suggestions: analysisResult.suggestions,
        recordDate: new Date().toISOString().split('T')[0], // 添加记录日期
        imageUrl: imageUrl || undefined,
      };
      
      log.apiRequest('POST', '/api/food/records', requestData);

      const response = await fetch('/api/food/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseTime = performance.now() - startTime;
      
      log.apiResponse('POST', '/api/food/records', response.status, responseTime, {
        ok: response.ok
      });

      if (response.ok) {
        log.info('Analysis result saved successfully');
        // 重新加载记录
        await loadInitialTimeline();
        // 重置表单
        resetForm();
        setShowAddForm(false);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      log.error('Save analysis result failed', error, { responseTime: `${responseTime.toFixed(2)}ms` });
      setError(error instanceof Error ? error.message : '保存失败');
    }
  };

  // 重置表单
  const resetForm = () => {
    log.userAction('Form reset');
    setSelectedImage(null);
    setImagePreview(null);
    setDescription('');
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理日期变化 - 已移除，改为时间轴显示

  // 复制记录到分析区域
  const copyRecordToAnalysis = async (record: FoodRecord) => {
    log.userAction('Copy record to analysis', { recordId: record.id });
    setDescription(record.description);
    
    // 如果有图片URL，设置图片预览
    if (record.imageUrl) {
      try {
        // 从URL获取图片并转换为File对象
        const response = await fetch(record.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type });
        
        setSelectedImage(file);
        setImagePreview(record.imageUrl);
        
        log.info('Image loaded for editing', { imageUrl: record.imageUrl });
      } catch (error) {
        log.error('Failed to load image for editing', { error, imageUrl: record.imageUrl });
        // 如果图片加载失败，清空图片状态
        setSelectedImage(null);
        setImagePreview(null);
      }
    } else {
      // 清空图片状态
      setSelectedImage(null);
      setImagePreview(null);
    }
    
    setShowAddForm(true);
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 删除记录
  const deleteRecord = async (recordId: string) => {
    if (!confirm('确定要删除这条记录吗？')) {
      return;
    }

    log.userAction('Delete record', { recordId });
    
    try {
      const response = await fetch(`/api/food/records/${recordId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        log.info('Record deleted successfully', { recordId });
        // 重新加载时间轴数据
        await loadInitialTimeline();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      log.error('Failed to delete record', error, { recordId });
      setError(error instanceof Error ? error.message : '删除失败');
    }
  };

  // 处理描述输入变化
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDescription(value);
    
    // 记录用户输入行为（节流记录，避免过多日志）
    if (value.length % 10 === 0) {
      log.userAction('Description input', {
        length: value.length,
        hasContent: value.trim().length > 0
      });
    }
  };

  // 显示/隐藏添加表单
  const toggleAddForm = () => {
    const newShowState = !showAddForm;
    log.userAction(`Add form ${newShowState ? 'opened' : 'closed'}`);
    setShowAddForm(newShowState);
    if (!newShowState) {
      resetForm();
    }
  };

  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="pt-16 pb-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="pt-16 pb-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">饮食记录</h1>
                  <p className="text-gray-600 mt-1">AI智能分析您的饮食营养</p>
                </div>
                <button
                  onClick={() => setShowHealthScoreInfo(!showHealthScoreInfo)}
                  className="text-gray-500 hover:text-primary-600 transition-colors"
                  title="查看健康评分标准"
                >
                  <Info className="h-5 w-5" />
                </button>
              </div>
              <button 
                onClick={toggleAddForm}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary-700"
              >
                <Camera className="h-5 w-5 mr-2" />
                {showAddForm ? '取消' : '添加记录'}
              </button>
            </div>

            {/* 健康评分标准说明 */}
            {showHealthScoreInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">健康评分标准 (1-100分)</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <div><span className="font-medium">90-100分:</span> 营养均衡，热量适中，富含维生素和矿物质</div>
                  <div><span className="font-medium">70-89分:</span> 营养较好，但可能某些营养素偏高或偏低</div>
                  <div><span className="font-medium">50-69分:</span> 营养一般，建议搭配其他食物平衡营养</div>
                  <div><span className="font-medium">30-49分:</span> 营养不均衡，高热量或缺乏重要营养素</div>
                  <div><span className="font-medium">1-29分:</span> 营养价值较低，建议减少摄入或改善搭配</div>
                </div>
              </div>
            )}

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
                        <p className="text-gray-600 mb-2">点击选择图片或拖拽到此处</p>
                        <p className="text-sm text-gray-500">支持 JPG、PNG 格式，最大 10MB</p>
                        <button
                          onClick={triggerFileSelect}
                          className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                        >
                          选择图片
                        </button>
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

                {/* 描述输入 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    食物描述（可选）
                  </label>
                  <textarea
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="描述您吃的食物，比如：一碗白米饭、一个苹果、一杯牛奶等..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows={3}
                  />
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}

                {/* 分析按钮 */}
                <div className="mb-6">
                  <button
                    onClick={analyzeFood}
                    disabled={isAnalyzing || (!selectedImage && !description.trim())}
                    className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        AI分析中...
                      </>
                    ) : (
                      'AI智能分析'
                    )}
                  </button>
                </div>

                {/* 分析结果 */}
                {analysisResult && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <h3 className="font-semibold text-green-800">分析完成</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">食物：</span>
                        <span className="text-gray-900">{analysisResult.foodName}</span>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">营养信息：</span>
                        <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                          <div>热量: {analysisResult.nutrition.calories} kcal</div>
                          <div>蛋白质: {analysisResult.nutrition.protein}g</div>
                          <div>碳水: {analysisResult.nutrition.carbs}g</div>
                          <div>脂肪: {analysisResult.nutrition.fat}g</div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">健康评分：</span>
                        <span className={`ml-2 px-2 py-1 rounded text-sm ${
                          analysisResult.healthScore >= 80 ? 'bg-green-100 text-green-800' :
                          analysisResult.healthScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {analysisResult.healthScore}/100
                        </span>
                      </div>
                      
                      {analysisResult.suggestions && (
                        <div>
                          <span className="font-medium text-gray-700">建议：</span>
                          <p className="text-gray-600 text-sm mt-1">{analysisResult.suggestions}</p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={saveAnalysisResult}
                      className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                    >
                      保存记录
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 时间轴记录 */}
            <div className="space-y-6">
              {timelineData.map((dayData) => (
                <div key={dayData.date} className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {dayData.date === new Date().toISOString().split('T')[0] 
                            ? '今天' 
                            : new Date(dayData.date).toLocaleDateString('zh-CN', {
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                              })
                          }
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">
                          {dayData.records.length} 条记录
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {dayData.date}
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {dayData.records.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>这一天没有饮食记录</p>
                        <p className="text-sm mt-1">点击上方"添加记录"开始记录您的饮食</p>
                      </div>
                    ) : (
                      dayData.records.map((record) => (
                    <div key={record.id} className="p-6 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {/* 图片和标题区域 */}
                          <div className="flex items-start space-x-4 mb-3">
                            {/* 图片显示 */}
                            {record.imageUrl ? (
                              <div className="flex-shrink-0">
                                <img 
                                  src={record.imageUrl} 
                                  alt={record.description}
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                  onError={(e) => {
                                    // 图片加载失败时隐藏图片元素
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                <Camera className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                            
                            {/* 标题和营养信息 */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900">{record.description}</h3>
                              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-600">
                                <div>热量: {record.nutrition.calories} kcal</div>
                                <div>蛋白质: {record.nutrition.protein}g</div>
                                <div>碳水: {record.nutrition.carbs}g</div>
                                <div>脂肪: {record.nutrition.fat}g</div>
                              </div>
                            </div>
                          </div>
                          
                          {record.aiAdvice && (
                            <div className="mt-2 text-sm text-gray-600">
                              <strong>AI建议:</strong> {record.aiAdvice}
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex flex-col items-end space-y-2">
                          {/* 操作按钮 */}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => copyRecordToAnalysis(record)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="复制到分析区域"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="删除记录"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {/* 健康评分 */}
                          {record.healthScore !== undefined && (
                            <div className={`px-2 py-1 rounded text-sm ${
                              record.healthScore >= 80 ? 'bg-green-100 text-green-800' :
                              record.healthScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.healthScore}/100
                            </div>
                          )}
                          
                          {/* 时间 */}
                          <div className="text-xs text-gray-500">
                            {new Date(record.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
              
              {/* 加载更多按钮 */}
              <div className="text-center">
                <button
                  onClick={loadMoreDays}
                  disabled={isLoadingMore}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}