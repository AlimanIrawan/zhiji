'use client';

import { useState, useEffect } from 'react';
import { Activity, Sync, Heart, Footprints, Zap, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import Navigation from '@/components/layout/navigation';

interface GarminData {
  userId: string;
  syncDate: string;
  totalCalories: number;
  activeCalories: number;
  restingCalories: number;
  steps: number;
  distance: number;
  floorsClimbed: number;
  heartRate: {
    resting: number;
    average: number;
    max: number;
    zones: {
      zone1: number;
      zone2: number;
      zone3: number;
      zone4: number;
      zone5: number;
    };
  };
  activities: Array<{
    id: string;
    name: string;
    type: string;
    startTime: string;
    duration: number;
    calories: number;
    distance: number;
  }>;
  trainingType: 'none' | 'A' | 'S' | 'both';
  syncedAt: string;
}

export default function GarminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [garminData, setGarminData] = useState<GarminData | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    console.log('[DEBUG] GarminPage: 组件已挂载');
    loadGarminData();
  }, []);

  const loadGarminData = async () => {
    try {
      setIsLoading(true);
      console.log('[DEBUG] GarminPage: 开始加载数据');
      
      // 获取最近的 Garmin 数据
      const response = await fetch('/api/garmin/sync');
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        setGarminData(result.data[0]); // 获取最新的数据
        setIsConfigured(true);
        console.log('[DEBUG] GarminPage: 数据加载成功:', result.data[0]);
      } else {
        console.log('[DEBUG] GarminPage: 暂无数据');
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('[ERROR] GarminPage: 数据加载失败:', error);
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    console.log('[DEBUG] GarminPage: 开始测试连接');
    setIsTesting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/garmin/test');
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Garmin Connect 连接测试成功！');
        setIsConfigured(true);
        console.log('[DEBUG] GarminPage: 连接测试成功:', result);
      } else {
        setError(result.error || '连接测试失败');
        setIsConfigured(false);
        console.error('[ERROR] GarminPage: 连接测试失败:', result.error);
      }
    } catch (error) {
      console.error('[ERROR] GarminPage: 连接测试异常:', error);
      setError('连接测试失败，请检查网络连接');
      setIsConfigured(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    console.log('[DEBUG] GarminPage: 开始同步');
    setIsSyncing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/garmin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGarminData(result.data);
        setSuccess('Garmin 数据同步成功！');
        setIsConfigured(true);
        console.log('[DEBUG] GarminPage: 同步成功:', result.data);
      } else {
        setError(result.error || '同步失败');
        console.error('[ERROR] GarminPage: 同步失败:', result.error);
      }
    } catch (error) {
      console.error('[ERROR] GarminPage: 同步异常:', error);
      setError('同步失败，请稍后重试');
    } finally {
      setIsSyncing(false);
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
              <h1 className="text-2xl font-bold text-gray-900">设备同步</h1>
              <p className="text-gray-600 mt-1">通过 Garmin Connect 同步您的运动数据</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-700 disabled:opacity-50"
              >
                <Settings className={`h-5 w-5 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? '测试中...' : '测试连接'}
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing || !isConfigured}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary-700 disabled:opacity-50"
              >
                <Sync className={`h-5 w-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? '同步中...' : '立即同步'}
              </button>
            </div>
          </div>

          {/* Configuration Status */}
          {!isConfigured && !isLoading && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>需要配置 Garmin 账号</strong>
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    请在环境变量中设置 GARMIN_EMAIL 和 GARMIN_PASSWORD，然后点击"测试连接"验证配置。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-12 h-12 ${isConfigured ? 'bg-green-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center mr-4`}>
                  <Activity className={`h-6 w-6 ${isConfigured ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Garmin Connect</h3>
                  <p className="text-sm text-gray-600">
                    {garminData ? `最后同步: ${new Date(garminData.syncedAt).toLocaleString('zh-CN')}` : '尚未同步'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 ${isConfigured ? 'bg-green-500' : 'bg-gray-400'} rounded-full mr-2`}></div>
                <span className={`text-sm ${isConfigured ? 'text-green-600' : 'text-gray-500'}`}>
                  {isConfigured ? '已配置' : '未配置'}
                </span>
              </div>
            </div>
          </div>

          {/* Today's Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">今日步数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {garminData ? garminData.steps.toLocaleString() : '--'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Footprints className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">消耗卡路里</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {garminData ? garminData.totalCalories.toLocaleString() : '--'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">平均心率</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {garminData && garminData.heartRate.average ? garminData.heartRate.average : '--'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Heart className="h-6 w-6 text-pink-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">运动距离</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {garminData ? `${garminData.distance.toFixed(1)}km` : '--'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">最近活动</h3>
            </div>
            <div className="p-6">
              {garminData && garminData.activities && garminData.activities.length > 0 ? (
                <div className="space-y-4">
                  {garminData.activities.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                          <Activity className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{activity.name}</h4>
                          <p className="text-sm text-gray-600">
                            {activity.type} • {new Date(activity.startTime).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.distance > 0 ? `${activity.distance.toFixed(1)}km` : ''}
                        </p>
                        <p className="text-sm text-gray-600">
                          {activity.calories > 0 ? `${activity.calories}卡` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无活动数据</h3>
                  <p className="text-gray-600 mb-6">
                    {isConfigured ? '同步您的 Garmin 数据以查看活动记录' : '请先配置 Garmin 账号'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}