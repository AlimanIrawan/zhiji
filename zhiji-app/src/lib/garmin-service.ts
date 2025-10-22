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

      // 获取活动数据（过去30天）
      const activities = await this.client.getActivities(0, 30);
      console.log('[DEBUG] GarminService: 获取活动数据:', activities?.length || 0, '条记录');

      // 获取睡眠数据
      let sleepData = null;
      try {
        sleepData = await this.client.getSleepData(targetDate);
        console.log('[DEBUG] GarminService: 获取睡眠数据成功');
      } catch (error) {
        console.warn('[WARN] GarminService: 获取睡眠数据失败:', error);
      }

      // 获取心率数据
      let heartRateData = null;
      try {
        heartRateData = await this.client.getHeartRate(targetDate);
        console.log('[DEBUG] GarminService: 获取心率数据成功');
      } catch (error) {
        console.warn('[WARN] GarminService: 获取心率数据失败:', error);
      }

      // 获取步数数据
      let stepsData = null;
      try {
        stepsData = await this.client.getSteps(targetDate);
        console.log('[DEBUG] GarminService: 获取步数数据成功');
      } catch (error) {
        console.warn('[WARN] GarminService: 获取步数数据失败:', error);
      }

      // 获取体重数据
      let weightData = null;
      try {
        weightData = await this.client.getDailyWeightData(targetDate);
        console.log('[DEBUG] GarminService: 获取体重数据成功');
      } catch (error) {
        console.warn('[WARN] GarminService: 获取体重数据失败:', error);
      }

      // 解析并返回数据
      const parsedData = this.parseGarminData(activities, dateStr, sleepData, heartRateData, stepsData, weightData, userProfile);
      
      console.log('[DEBUG] GarminService: 数据同步完成');
      return parsedData;

    } catch (error) {
      console.error('[ERROR] GarminService: 数据同步失败:', error);
      throw new Error(`数据同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析Garmin数据为标准格式
   * 注意：由于garmin-connect库API限制，某些数据无法获取，将设为默认值
   */
  private parseGarminData(
    activities: any[], 
    dateStr: string, 
    sleepData?: any, 
    heartRateData?: any, 
    stepsData?: any, 
    weightData?: any, 
    userProfile?: any
  ): GarminData {
    // 生成过去7天的日期数组
    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // 从活动数据中查找对应日期的数据
      const dayActivities = activities?.filter(activity => {
        const activityDate = new Date(activity.startTimeLocal || activity.startTimeGMT);
        return activityDate.toISOString().split('T')[0] === dateString;
      }) || [];
      
      const totalCalories = dayActivities.reduce((sum, activity) => sum + (activity.calories || 0), 0);
      const steps = i === 0 ? (typeof stepsData === 'number' ? stepsData : 0) : 0; // 只有今天有步数数据
      
      last7DaysData.push({
        date: dateString,
        totalCalories: totalCalories || 0,
        activeCalories: Math.round(totalCalories * 0.7), // 估算活动卡路里
        bmrCalories: 1800, // 基础代谢估算值
        steps: steps
      });
    }

    // 解析活动数据
    const parsedActivities = (activities || []).slice(0, 10).map(activity => ({
      name: activity.activityName || activity.activityType?.typeKey || '未知活动',
      type: activity.activityType?.typeKey || 'unknown',
      duration: activity.duration || 0,
      calories: activity.calories || 0,
      distance: (activity.distance || 0) / 1000 // 转换为公里
    }));

    // 解析睡眠数据
    const parsedSleep = {
      totalSleepTime: sleepData?.totalSleepTimeSeconds ? Math.round(sleepData.totalSleepTimeSeconds / 60) : 0,
      deepSleep: sleepData?.deepSleepSeconds ? Math.round(sleepData.deepSleepSeconds / 60) : 0,
      lightSleep: sleepData?.lightSleepSeconds ? Math.round(sleepData.lightSleepSeconds / 60) : 0,
      remSleep: sleepData?.remSleepSeconds ? Math.round(sleepData.remSleepSeconds / 60) : 0,
      awakeTime: sleepData?.awakeTimeSeconds ? Math.round(sleepData.awakeTimeSeconds / 60) : 0,
      sleepScore: sleepData?.sleepScores?.overall?.value || 0
    };

    // 解析身体指标
    const parsedBodyMetrics = {
      fitnessAge: userProfile?.fitnessAge || 25, // 默认值
      hrv: {
        lastNightAvg: heartRateData?.restingHeartRate || 0,
        status: heartRateData ? 'normal' : 'unknown'
      }
    };

    return {
      userId: userProfile?.displayName || 'garmin_user',
      syncDate: dateStr,
      last7Days: last7DaysData,
      activities: parsedActivities,
      sleep: parsedSleep,
      bodyMetrics: parsedBodyMetrics,
      syncedAt: new Date().toISOString()
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