'use client';

import { useState, useEffect } from 'react';
import { Camera, Plus, Search, Filter } from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import { FoodRecord } from '@/types';

export default function FoodPage() {
  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">饮食记录</h1>
              <p className="text-gray-600 mt-1">记录和分析您的饮食</p>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary-700">
              <Plus className="h-5 w-5 mr-2" />
              添加记录
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                  <Camera className="h-6 w-6 text-primary-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">拍照识别</h3>
                  <p className="text-sm text-gray-600">AI智能识别食物营养</p>
                </div>
              </div>
            </button>
            
            <button className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Plus className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">手动添加</h3>
                  <p className="text-sm text-gray-600">手动输入食物信息</p>
                </div>
              </div>
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索食物记录..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="h-5 w-5 mr-2" />
              筛选
            </button>
          </div>

          {/* Records List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-400">
                <p className="text-red-700">错误: {error}</p>
              </div>
            )}
            
            {records.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有饮食记录</h3>
                <p className="text-gray-600 mb-6">开始记录您的第一餐吧！</p>
                <button className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700">
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