'use client';

import { useEffect, useState } from 'react';
import { 
  Flame, 
  Target, 
  Activity, 
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import StatsCard from '@/components/dashboard/stats-card';
import QuickActions from '@/components/dashboard/quick-actions';
import ProgressRing from '@/components/ui/progress-ring';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DashboardData {
  todayCalories: number;
  calorieGoal: number;
  todaySteps: number;
  stepGoal: number;
  weeklyProgress: number;
  recentMeals: any[];
}

export default function HomePage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    todayCalories: 0,
    calorieGoal: 2000,
    todaySteps: 0,
    stepGoal: 10000,
    weeklyProgress: 0,
    recentMeals: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[DEBUG] HomePage: 组件已挂载，开始加载数据');
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('[DEBUG] HomePage: 开始加载仪表板数据');
      setIsLoading(true);
      
      // 测试数据库连接
      try {
        console.log('[DEBUG] HomePage: 测试数据库连接...');
        const dbTestResponse = await fetch('/api/debug/db-test');
        const dbTestResult = await dbTestResponse.json();
        console.log('[DEBUG] HomePage: 数据库测试结果:', dbTestResult);
      } catch (dbError) {
        console.error('[DEBUG] HomePage: 数据库连接测试失败:', dbError);
      }
      
      // 使用模拟数据，因为这是个人应用
      console.log('[DEBUG] HomePage: 设置模拟数据');
      setDashboardData({
        todayCalories: 1250,
        calorieGoal: 2000,
        todaySteps: 8500,
        stepGoal: 10000,
        weeklyProgress: 65,
        recentMeals: [
          {
            id: '1',
            foodName: '燕麦粥配蓝莓',
            timestamp: new Date().toISOString(),
            nutrition: { calories: 320, protein: 12, carbs: 58, fat: 6 }
          },
          {
            id: '2', 
            foodName: '鸡胸肉沙拉',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            nutrition: { calories: 450, protein: 35, carbs: 15, fat: 18 }
          },
          {
            id: '3',
            foodName: '苹果',
            timestamp: new Date(Date.now() - 7200000).toISOString(), 
            nutrition: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 }
          }
        ],
      });
      console.log('[DEBUG] HomePage: 数据加载完成');
    } catch (error) {
      console.error('[DEBUG] HomePage: 加载仪表板数据失败:', error);
      console.error('[DEBUG] HomePage: 错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
      // 设置默认数据
      setDashboardData({
        todayCalories: 0,
        calorieGoal: 2000,
        todaySteps: 0,
        stepGoal: 10000,
        weeklyProgress: 0,
        recentMeals: [],
      });
    } finally {
      console.log('[DEBUG] HomePage: 设置加载状态为false');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    console.log('[DEBUG] HomePage: 显示加载状态');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  console.log('[DEBUG] HomePage: 渲染主页面，数据:', dashboardData);

  const calorieProgress = (dashboardData.todayCalories / dashboardData.calorieGoal) * 100;
  const stepProgress = (dashboardData.todaySteps / dashboardData.stepGoal) * 100;
  const today = format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main Content */}
      <main className="pt-16 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              你好，欢迎使用脂记！
            </h1>
            <p className="text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {today}
            </p>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Calorie Progress */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">今日卡路里</h3>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <ProgressRing
                    progress={Math.min(calorieProgress, 100)}
                    size={120}
                    color="#3B82F6"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {dashboardData.todayCalories}
                      </div>
                      <div className="text-sm text-gray-500">
                        / {dashboardData.calorieGoal}
                      </div>
                    </div>
                  </ProgressRing>
                </div>
                <div className="ml-6">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">已摄入</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-200 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">剩余</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      剩余 {Math.max(0, dashboardData.calorieGoal - dashboardData.todayCalories)} 卡路里
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps Progress */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">今日步数</h3>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <ProgressRing
                    progress={Math.min(stepProgress, 100)}
                    size={120}
                    color="#10B981"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {dashboardData.todaySteps.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">步</div>
                    </div>
                  </ProgressRing>
                </div>
                <div className="ml-6">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">已完成</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-200 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">目标</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      目标 {dashboardData.stepGoal.toLocaleString()} 步
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="本周进度"
              value={dashboardData.weeklyProgress}
              unit="%"
              icon={TrendingUp}
              color="bg-purple-500"
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard
              title="今日消耗"
              value="2,340"
              unit="卡路里"
              icon={Flame}
              color="bg-red-500"
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard
              title="活跃时间"
              value="45"
              unit="分钟"
              icon={Activity}
              color="bg-orange-500"
              trend={{ value: 5, isPositive: false }}
            />
            <StatsCard
              title="目标达成"
              value="3"
              unit="天"
              icon={Target}
              color="bg-green-500"
              trend={{ value: 15, isPositive: true }}
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Meals */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">最近用餐</h3>
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    查看全部
                  </button>
                </div>
                <div className="space-y-4">
                  {dashboardData.recentMeals.map((meal) => (
                    <div key={meal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                          <Flame className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{meal.name}</p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {meal.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{meal.calories}</p>
                        <p className="text-xs text-gray-500">卡路里</p>
                      </div>
                    </div>
                  ))}
                  {dashboardData.recentMeals.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">今天还没有用餐记录</p>
                      <p className="text-sm text-gray-400 mt-1">开始记录您的第一餐吧！</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <QuickActions />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}