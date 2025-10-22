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
    this.email = process.env.GARMIN_USERNAME || '';
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
   * 注意：由于garmin-connect库的限制，某些数据类型可能无法获取
   */
  async syncData(date?: string): Promise<GarminData> {
    // 如果未配置Garmin账号，抛出错误
    if (!this.isConfigured()) {
      throw new Error('未配置 Garmin 账号信息，请在环境变量中设置 GARMIN_USERNAME 和 GARMIN_PASSWORD');
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

      // 解析并返回数据
      const parsedData = this.parseGarminData(activities, dateStr);
      
      console.log('[DEBUG] GarminService: 数据同步完成');
      return parsedData;

    } catch (error) {
      console.error('[ERROR] GarminService: 数据同步失败:', error);
      throw new Error(`数据同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析 Garmin 原始数据
   * 注意：由于garmin-connect库API限制，某些数据无法获取，将设为默认值
   */
  private parseGarminData(activities: any[], dateStr: string): GarminData {
    // 生成过去7天的日期数组
    const last7DaysData = [];
    const targetDate = new Date(dateStr);
    
    for (let i = 6; i >= 0; i--) {
      const currentDate = new Date(targetDate);
      currentDate.setDate(currentDate.getDate() - i);
      const currentDateStr = currentDate.toISOString().split('T')[0];
      
      // 计算当天的活动数据
      const dayActivities = (activities || []).filter((activity: any) => {
        const activityDate = new Date(activity.startTimeLocal || activity.beginTimestamp);
        return activityDate.toISOString().split('T')[0] === currentDateStr;
      });
      
      // 汇总当天数据
      const totalCalories = dayActivities.reduce((sum: number, activity: any) => 
        sum + (activity.calories || 0), 0);
      const totalSteps = dayActivities.reduce((sum: number, activity: any) => 
        sum + (activity.steps || 0), 0);
      
      last7DaysData.push({
        date: currentDateStr,
        totalCalories: totalCalories,
        activeCalories: Math.round(totalCalories * 0.7), // 估算活动卡路里
        bmrCalories: Math.round(totalCalories * 0.3), // 估算基础代谢
        steps: totalSteps,
      });
    }

    // 解析活动记录（最近10条）
    const parsedActivities = (activities || []).slice(0, 10).map((activity: any) => ({
      name: activity.activityName || activity.name || '未知活动',
      type: activity.activityType?.typeKey || activity.type || '未知类型',
      duration: activity.duration || activity.elapsedDuration || 0, // 持续时间（秒）
      calories: activity.calories || 0, // 消耗卡路里
      distance: activity.distance ? (activity.distance / 1000) : 0 // 距离（公里）
    }));

    // 睡眠数据 - 由于API限制，暂时设为默认值
    const sleep = {
      totalSleepTime: 0, // 总睡眠时间（分钟）
      deepSleep: 0, // 深度睡眠（分钟）
      lightSleep: 0, // 浅度睡眠（分钟）
      remSleep: 0, // REM睡眠（分钟）
      awakeTime: 0, // 清醒时间（分钟）
      sleepScore: 0 // 睡眠评分
    };

    // 身体指标 - 由于API限制，暂时设为默认值
    const bodyMetrics = {
      fitnessAge: 0, // 体能年龄
      hrv: {
        lastNightAvg: 0, // 昨夜平均HRV
        status: 'unavailable' // 状态
      }
    };

    return {
      userId: 'garmin-user',
      syncDate: dateStr,
      // 过去7天基础数据
      last7Days: last7DaysData,
      // 活动记录
      activities: parsedActivities,
      // 睡眠分析
      sleep,
      // 身体指标
      bodyMetrics,
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