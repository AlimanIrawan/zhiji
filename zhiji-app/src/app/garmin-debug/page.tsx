'use client';

import { useState, useEffect } from 'react';

interface GarminData {
  syncDate: string;
  syncTime: string;
  hasData: boolean;
  
  // 基础数据
  totalCalories: number;
  activeCalories: number;
  bmrCalories: number;
  steps: number;
  
  // 活动记录
  activities: Array<{
    name: string;
    type: string;
    duration: number;
    calories: number;
    distance: number;
  }>;
  
  // 睡眠分析
  sleep: {
    totalSleepTime: number;
    totalSleepTimeSeconds: number;
    deepSleep: number;
    deepSleepSeconds: number;
    lightSleep: number;
    lightSleepSeconds: number;
    remSleep: number;
    remSleepSeconds: number;
    awakeTime: number;
    awakeTimeSeconds: number;
    sleepScore: number;
  };
  
  // 健康指标
  bodyMetrics: {
    fitnessAge: number;
    hrv: {
      lastNightAvg: number;
      status: string;
    };
  };
}

export default function GarminDebugPage() {
  const [data, setData] = useState<GarminData[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  // 数据过滤函数 - 过滤掉无用的字段
  const filterUsefulData = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    
    if (Array.isArray(obj)) {
      const filtered = obj.filter(item => item !== null && item !== undefined).map(filterUsefulData);
      return filtered.length > 0 ? filtered : null;
    }
    
    if (typeof obj === 'object') {
      const filtered: any = {};
      let hasUsefulData = false;
      
      for (const [key, value] of Object.entries(obj)) {
        // 跳过明显无用的字段
        if (key.includes('Id') || key.includes('UUID') || key.includes('uuid') || 
            key.includes('Gmt') || key.includes('Local') || key.includes('Profile') ||
            key === 'isMock' || key === 'trainingType') {
          continue;
        }
        
        const filteredValue = filterUsefulData(value);
        
        // 只保留有意义的值
        if (filteredValue !== null && filteredValue !== undefined && 
            filteredValue !== 0 && filteredValue !== '' && 
            filteredValue !== 'NO_DATA' && filteredValue !== 'none' &&
            !(typeof filteredValue === 'object' && Object.keys(filteredValue).length === 0)) {
          filtered[key] = filteredValue;
          hasUsefulData = true;
        }
      }
      
      return hasUsefulData ? filtered : null;
    }
    
    // 基本类型值的过滤
    if (obj === 0 || obj === '' || obj === 'NO_DATA' || obj === 'none') {
      return null;
    }
    
    return obj;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/garmin/sync?days=${days}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : '加载数据时发生错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  };

  // 计算数据完整度
  const calculateDataCompleteness = (dayData: GarminData) => {
    let score = 0;
    let maxScore = 0;

    // 基础数据评分
    maxScore += 4;
    if (dayData.totalCalories > 0) score += 1;
    if (dayData.activeCalories > 0) score += 1;
    if (dayData.bmrCalories > 0) score += 1;
    if (dayData.steps > 0) score += 1;

    // 活动数据评分
    maxScore += 2;
    if (dayData.activities && dayData.activities.length > 0) {
      const validActivities = dayData.activities.filter(act => 
        act.duration > 0 || act.calories > 0 || act.distance > 0
      );
      if (validActivities.length > 0) score += 2;
    }

    // 睡眠数据评分
    maxScore += 3;
    if (dayData.sleep.totalSleepTimeSeconds > 0) score += 1;
    if (dayData.sleep.deepSleepSeconds > 0 || dayData.sleep.lightSleepSeconds > 0) score += 1;
    if (dayData.sleep.sleepScore > 0) score += 1;

    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 80) return { level: 'complete', text: '数据完整', color: 'bg-green-100 text-green-800' };
    if (percentage >= 50) return { level: 'partial', text: '数据部分', color: 'bg-yellow-100 text-yellow-800' };
    if (percentage >= 20) return { level: 'limited', text: '数据较少', color: 'bg-orange-100 text-orange-800' };
    return { level: 'none', text: '无有效数据', color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Garmin 数据调试页面</h1>
          
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700">
              获取天数:
              <select 
                value={days} 
                onChange={(e) => setDays(Number(e.target.value))}
                className="ml-2 border border-gray-300 rounded px-3 py-1"
              >
                <option value={3}>3天</option>
                <option value={7}>7天</option>
                <option value={14}>14天</option>
                <option value={30}>30天</option>
              </select>
            </label>
            
            <button 
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '加载中...' : '刷新数据'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-800">错误: {error}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {data.map((dayData, index) => {
            const completeness = calculateDataCompleteness(dayData);
            
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {dayData.syncDate} ({dayData.syncTime})
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${completeness.color}`}>
                    {completeness.text}
                  </span>
                </div>

                {completeness.level !== 'none' ? (
                  <>
                    {/* 基础数据 */}
                    {(dayData.totalCalories > 0 || dayData.activeCalories > 0 || dayData.bmrCalories > 0 || dayData.steps > 0) && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-800 mb-3 border-b border-gray-200 pb-2">📊 基础数据</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {dayData.totalCalories > 0 && (
                            <div className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                              <div className="text-sm text-red-600 font-medium">总卡路里消耗</div>
                              <div className="text-lg font-bold text-red-800">{dayData.totalCalories}</div>
                            </div>
                          )}
                          {dayData.activeCalories > 0 && (
                            <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-400">
                              <div className="text-sm text-orange-600 font-medium">活动卡路里</div>
                              <div className="text-lg font-bold text-orange-800">{dayData.activeCalories}</div>
                            </div>
                          )}
                          {dayData.bmrCalories > 0 && (
                            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                              <div className="text-sm text-blue-600 font-medium">基础代谢</div>
                              <div className="text-lg font-bold text-blue-800">{dayData.bmrCalories}</div>
                            </div>
                          )}
                          {dayData.steps > 0 && (
                            <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                              <div className="text-sm text-green-600 font-medium">步数</div>
                              <div className="text-lg font-bold text-green-800">{dayData.steps.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                        {dayData.totalCalories === 0 && dayData.activeCalories === 0 && dayData.bmrCalories === 0 && dayData.steps === 0 && (
                          <p className="text-gray-500 text-center py-4">该日期暂无基础数据记录</p>
                        )}
                      </div>
                    )}

                    {/* 活动记录 */}
                    {dayData.activities && dayData.activities.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-800 mb-3 border-b border-gray-200 pb-2">🏃‍♂️ 活动记录</h3>
                        <div className="space-y-3">
                          {dayData.activities.filter(activity => 
                            activity.duration > 0 || activity.calories > 0 || activity.distance > 0
                          ).map((activity, actIndex) => (
                            <div key={actIndex} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-blue-900">{activity.name}</h4>
                                  <p className="text-sm text-blue-700">{activity.type}</p>
                                </div>
                                <div className="text-right text-sm text-blue-800">
                                  {activity.duration > 0 && <div>时长: {formatTime(activity.duration)}</div>}
                                  {activity.calories > 0 && <div>卡路里: {activity.calories}</div>}
                                  {activity.distance > 0 && <div>距离: {(activity.distance / 1000).toFixed(2)}km</div>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 睡眠分析 */}
                    {(dayData.sleep.totalSleepTimeSeconds > 0 || dayData.sleep.deepSleepSeconds > 0 || 
                      dayData.sleep.lightSleepSeconds > 0 || dayData.sleep.remSleepSeconds > 0 || 
                      dayData.sleep.sleepScore > 0) && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-800 mb-3 border-b border-gray-200 pb-2">😴 睡眠分析</h3>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {dayData.sleep.totalSleepTimeSeconds > 0 && (
                              <div>
                                <span className="font-medium text-purple-700">总睡眠时间:</span> 
                                <span className="ml-1 font-semibold">{formatTime(dayData.sleep.totalSleepTimeSeconds)}</span>
                              </div>
                            )}
                            {dayData.sleep.deepSleepSeconds > 0 && (
                              <div>
                                <span className="font-medium text-purple-700">深度睡眠:</span> 
                                <span className="ml-1 font-semibold">{formatTime(dayData.sleep.deepSleepSeconds)}</span>
                              </div>
                            )}
                            {dayData.sleep.lightSleepSeconds > 0 && (
                              <div>
                                <span className="font-medium text-purple-700">浅度睡眠:</span> 
                                <span className="ml-1 font-semibold">{formatTime(dayData.sleep.lightSleepSeconds)}</span>
                              </div>
                            )}
                            {dayData.sleep.remSleepSeconds > 0 && (
                              <div>
                                <span className="font-medium text-purple-700">REM睡眠:</span> 
                                <span className="ml-1 font-semibold">{formatTime(dayData.sleep.remSleepSeconds)}</span>
                              </div>
                            )}
                            {dayData.sleep.awakeTimeSeconds > 0 && (
                              <div>
                                <span className="font-medium text-purple-700">清醒时间:</span> 
                                <span className="ml-1 font-semibold">{formatTime(dayData.sleep.awakeTimeSeconds)}</span>
                              </div>
                            )}
                            {dayData.sleep.sleepScore > 0 && (
                              <div>
                                <span className="font-medium text-purple-700">睡眠评分:</span> 
                                <span className="ml-1 font-semibold text-purple-800">{dayData.sleep.sleepScore}/100</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-gray-50 p-8 rounded text-center">
                    <div className="text-gray-400 text-4xl mb-2">📊</div>
                    <p className="text-gray-500 font-medium">该日期暂无有效数据记录</p>
                    <p className="text-gray-400 text-sm mt-1">可能是设备未佩戴或数据同步异常</p>
                  </div>
                )}

                {/* 原始数据 */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    查看原始数据结构
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(dayData, null, 2)}
                  </pre>
                </details>

                {/* 过滤后的有用数据 */}
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                    查看过滤后的有用数据 ✨
                  </summary>
                  <div className="mt-2 p-3 bg-blue-50 rounded">
                    {(() => {
                      const filteredData = filterUsefulData(dayData);
                      if (!filteredData || Object.keys(filteredData).length === 0) {
                        return <p className="text-gray-500 text-sm">该日期暂无有效数据</p>;
                      }
                      return (
                        <pre className="text-xs overflow-auto text-blue-900">
                          {JSON.stringify(filteredData, null, 2)}
                        </pre>
                      );
                    })()}
                  </div>
                </details>
              </div>
            );
          })}
        </div>

        {data.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>
    </div>
  );
}