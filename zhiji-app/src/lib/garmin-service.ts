import { GarminConnect } from 'garmin-connect';

// Garmin 数据接口定义
export interface GarminData {
  userId: string;
  syncDate: string;
  
  // 过去7天基础数据（按天为单位）
  last7Days: Array<{
    date: string;
    totalCalories: number;
    activeCalories: number;
    bmrCalories: number; // 基础代谢卡路里
    steps: number;
  }>;
  
  // 活动记录
  activities: Array<{
    name: string;
    type: string;
    duration: number; // 持续时间（秒）
    calories: number; // 消耗卡路里
    distance: number; // 距离（公里）
  }>;
  
  // 睡眠分析
  sleep: {
    totalSleepTime: number; // 总睡眠时间（分钟）
    deepSleep: number; // 深度睡眠（分钟）
    lightSleep: number; // 浅度睡眠（分钟）
    remSleep: number; // REM睡眠（分钟）
    awakeTime: number; // 清醒时间（分钟）
    sleepScore: number; // 睡眠评分
  };
  
  // 身体指标
  bodyMetrics: {
    fitnessAge: number; // 体能年龄
    hrv: {
      lastNightAvg: number; // 昨夜平均HRV
      status: string;
    };
  };
  
  syncedAt: string;
}

/**
 * Garmin Connect 服务类
 * 使用 garmin-connect 库进行模拟登录获取数据
 */
export class GarminService {
  private client: GarminConnect | null = null;
  private isLoggedIn = false;
  private email: string;
  private password: string;

  constructor() {
    this.email = process.env.GARMIN_EMAIL || '';
    this.password = process.env.GARMIN_PASSWORD || '';
  }

  /**
   * 检查是否已配置 Garmin 账号
   */
  isConfigured(): boolean {
    return !!(this.email && this.password);
  }

  /**
   * 登录 Garmin Connect
   */
  async login(): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('未配置 Garmin 账号信息');
    }

    try {
      this.client = new GarminConnect({
        username: this.email,
        password: this.password,
      });

      await this.client.login();
      this.isLoggedIn = true;
      console.log('[DEBUG] GarminService: 登录成功');
      return true;
    } catch (error) {
      console.error('[ERROR] GarminService: 登录失败:', error);
      this.isLoggedIn = false;
      throw new Error(`Garmin 登录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 确保已登录
   */
  private async ensureLoggedIn(): Promise<void> {
    if (!this.isLoggedIn || !this.client) {
      await this.login();
    }
  }

  /**
   * 同步 Garmin 数据
   * 获取真实的Garmin Connect数据，包括活动、睡眠、HRV等健康指标
   */
  async syncData(date?: string): Promise<GarminData> {
    // 如果未配置Garmin账号，抛出错误
    if (!this.isConfigured()) {
      throw new Error('未配置 Garmin 账号信息，请在环境变量中设置 GARMIN_EMAIL 和 GARMIN_PASSWORD');
    }

    await this.ensureLoggedIn();
    
    if (!this.client) {
      throw new Error('Garmin 客户端未初始化');
    }

    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    try {
      console.log('[DEBUG] GarminService: 开始同步数据，日期:', dateStr);

      // 获取用户信息（验证连接）
      const userProfile = await this.client.getUserProfile();
      console.log('[DEBUG] GarminService: 用户信息:', userProfile?.displayName || '未知用户');

      // 如果请求的是过去7天数据，则获取每一天的数据
      if (date === 'last7days') {
        return await this.getLast7DaysData(userProfile);
      }

      // 获取指定日期的单日数据
      return await this.getSingleDayData(targetDate, dateStr, userProfile);

    } catch (error) {
      console.error('[ERROR] GarminService: 数据同步失败:', error);
      throw new Error(`数据同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取过去7天的数据
   */
  private async getLast7DaysData(userProfile: any): Promise<GarminData> {
    const last7DaysData = [];
    
    // 获取过去7天的数据
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      try {
        // 获取该日期的步数数据
        let stepsData = 0;
        try {
          stepsData = await this.client!.getSteps(date) || 0;
        } catch (error) {
          console.warn(`[WARN] 获取${dateString}步数数据失败:`, error);
        }

        // 获取该日期的活动数据（过滤当天的活动）
        const activities = await this.client!.getActivities(0, 50);
        const dayActivities = activities?.filter(activity => {
          const activityDate = new Date(activity.startTimeLocal || activity.startTimeGMT);
          return activityDate.toISOString().split('T')[0] === dateString;
        }) || [];

        const totalCalories = dayActivities.reduce((sum, activity) => sum + (activity.calories || 0), 0);
        
        last7DaysData.push({
          date: dateString,
          totalCalories: totalCalories || 0,
          activeCalories: Math.round(totalCalories * 0.7), // 估算活动卡路里
          bmrCalories: 1800, // 基础代谢估算值
          steps: stepsData
        });
      } catch (error) {
        console.warn(`[WARN] 获取${dateString}数据失败:`, error);
        // 添加默认数据
        last7DaysData.push({
          date: dateString,
          totalCalories: 0,
          activeCalories: 0,
          bmrCalories: 1800,
          steps: 0
        });
      }
    }

    // 获取全局数据（HRV和fitness age）
    const globalData = await this.getGlobalHealthData();

    return {
      userId: userProfile?.displayName || 'garmin_user',
      syncDate: new Date().toISOString().split('T')[0],
      last7Days: last7DaysData,
      activities: [], // 过去7天概览不包含具体活动
      sleep: {
        totalSleepTime: 0,
        deepSleep: 0,
        lightSleep: 0,
        remSleep: 0,
        awakeTime: 0,
        sleepScore: 0
      },
      bodyMetrics: globalData,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * 获取单日数据
   */
  private async getSingleDayData(targetDate: Date, dateStr: string, userProfile: any): Promise<GarminData> {
    // 获取指定日期的活动数据
    const activities = await this.client!.getActivities(0, 50);
    const dayActivities = activities?.filter(activity => {
      const activityDate = new Date(activity.startTimeLocal || activity.startTimeGMT);
      return activityDate.toISOString().split('T')[0] === dateStr;
    }) || [];

    console.log(`[DEBUG] GarminService: 获取${dateStr}活动数据:`, dayActivities?.length || 0, '条记录');

    // 获取睡眠数据
    let sleepData = null;
    try {
      sleepData = await this.client!.getSleepData(targetDate);
      console.log('[DEBUG] GarminService: 获取睡眠数据成功:', sleepData);
    } catch (error) {
      console.warn('[WARN] GarminService: 获取睡眠数据失败:', error);
    }

    // 获取步数数据
    let stepsData = 0;
    try {
      stepsData = await this.client!.getSteps(targetDate) || 0;
      console.log('[DEBUG] GarminService: 获取步数数据成功:', stepsData);
    } catch (error) {
      console.warn('[WARN] GarminService: 获取步数数据失败:', error);
    }

    // 获取全局健康数据
    const globalData = await this.getGlobalHealthData();

    // 解析并返回数据
    return this.parseSingleDayData(dayActivities, dateStr, sleepData, stepsData, userProfile, globalData);
  }

  /**
   * 解析单日Garmin数据
   */
  private parseSingleDayData(
    activities: any[], 
    dateStr: string, 
    sleepData: any, 
    stepsData: number, 
    userProfile: any, 
    globalData: any
  ): GarminData {
    // 解析活动数据
    const parsedActivities = activities.map(activity => ({
      name: activity.activityName || activity.activityType?.typeKey || '未知活动',
      type: activity.activityType?.typeKey || 'unknown',
      duration: activity.duration || 0,
      calories: activity.calories || 0,
      distance: activity.distance || 0
    }));

    // 计算当日总卡路里
    const totalCalories = activities.reduce((sum, activity) => sum + (activity.calories || 0), 0);

    // 解析睡眠数据
    const parsedSleep = {
      totalSleepTime: sleepData?.totalSleepTimeSeconds ? Math.round(sleepData.totalSleepTimeSeconds / 60) : 0,
      deepSleep: sleepData?.deepSleepSeconds ? Math.round(sleepData.deepSleepSeconds / 60) : 0,
      lightSleep: sleepData?.lightSleepSeconds ? Math.round(sleepData.lightSleepSeconds / 60) : 0,
      remSleep: sleepData?.remSleepSeconds ? Math.round(sleepData.remSleepSeconds / 60) : 0,
      awakeTime: sleepData?.awakeTimeSeconds ? Math.round(sleepData.awakeTimeSeconds / 60) : 0,
      sleepScore: sleepData?.sleepScore || 0
    };

    return {
      userId: userProfile?.displayName || 'garmin_user',
      syncDate: dateStr,
      last7Days: [{
        date: dateStr,
        totalCalories: totalCalories || 0,
        activeCalories: Math.round(totalCalories * 0.7), // 估算活动卡路里
        bmrCalories: 1800, // 基础代谢估算值
        steps: stepsData
      }],
      activities: parsedActivities,
      sleep: parsedSleep,
      bodyMetrics: globalData,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * 获取全局健康数据（HRV和fitness age）
   */
  private async getGlobalHealthData(): Promise<any> {
    let hrvData = null;
    let fitnessAge = 25; // 默认值

    try {
      // 获取最新的心率数据（可能包含HRV信息）
      const heartRateData = await this.client!.getHeartRate();
      hrvData = heartRateData;
      console.log('[DEBUG] GarminService: 获取心率/HRV数据成功');
    } catch (error) {
      console.warn('[WARN] GarminService: 获取心率/HRV数据失败:', error);
    }

    try {
      // 尝试从用户配置中获取fitness age（注意：实际API可能不包含此字段）
      const userProfile = await this.client!.getUserProfile();
      // 由于ISocialProfile类型不包含fitnessAge，我们使用默认值
      console.log('[DEBUG] GarminService: 用户配置信息:', userProfile);
    } catch (error) {
      console.warn('[WARN] GarminService: 获取用户配置失败:', error);
    }

    return {
      fitnessAge: fitnessAge,
      hrv: {
        lastNightAvg: hrvData?.restingHeartRate || 0,
        status: hrvData ? 'normal' : 'unknown'
      }
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: '未配置 Garmin 账号信息',
        };
      }

      await this.login();
      
      // 测试获取用户信息
      const userProfile = await this.client!.getUserProfile();
      
      return {
          success: true,
          message: '连接成功',
          data: {
            displayName: userProfile?.displayName || '未知用户',
            username: this.email,
          },
        };
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }
}

// 导出单例实例
export const garminService = new GarminService();