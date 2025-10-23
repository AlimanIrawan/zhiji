// Garmin 数据接口定义
export interface GarminData {
  userId: string;
  syncDate: string;
  
  // 过去7天的每日汇总数据
  last7Days: Array<{
    date: string;
    totalCalories: number;
    activeCalories: number;
    bmrCalories: number; // 基础代谢卡路里
    steps: number;
  }>;
  
  // 当日活动列表
  activities: Array<{
    name: string;
    type: string;
    duration: number; // 持续时间（秒）
    calories: number; // 消耗卡路里
    distance: number; // 距离（公里）
  }>;
  
  // 当日睡眠数据
  sleep: {
    totalSleepTime: number | string; // 总睡眠时间（分钟或格式化字符串）
    deepSleep: number | string; // 深度睡眠（分钟或格式化字符串）
    lightSleep: number | string; // 浅度睡眠（分钟或格式化字符串）
    remSleep: number | string; // REM睡眠（分钟或格式化字符串）
    awakeTime: number | string; // 清醒时间（分钟或格式化字符串）
    sleepScore: number; // 睡眠评分
    hrv: {
      lastNightAvg: number; // 昨夜平均HRV
      status: string;
    };
  };

  syncedAt: string;
}

/**
 * Garmin Connect 服务类 - Python版本
 * 使用 Python garminconnect 库通过API调用获取数据
 */
export class GarminService {
  private isLoggedIn = false;
  private email: string;
  private password: string;

  constructor() {
    this.email = process.env.GARMIN_EMAIL || '';
    this.password = process.env.GARMIN_PASSWORD || '';
  }

  /**
   * 检查是否已配置Garmin账户信息
   */
  isConfigured(): boolean {
    return !!(this.email && this.password);
  }

  /**
   * 登录Garmin Connect
   */
  async login(): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Garmin账户信息未配置');
    }

    try {
      const response = await fetch('/api/garmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email: this.email,
          password: this.password
        })
      });

      const result = await response.json();
      
      if (result.success && result.data.success) {
        this.isLoggedIn = true;
        return true;
      } else {
        throw new Error(result.error || '登录失败');
      }
    } catch (error) {
      console.error('Garmin登录失败:', error);
      this.isLoggedIn = false;
      throw error;
    }
  }

  /**
   * 确保已登录
   */
  private async ensureLoggedIn(): Promise<void> {
    if (!this.isLoggedIn) {
      await this.login();
    }
  }

  /**
   * 同步Garmin数据
   * @param date 可选的日期字符串，格式为 YYYY-MM-DD
   * @returns Promise<GarminData>
   */
  async syncData(date?: string): Promise<GarminData> {
    if (!this.isConfigured()) {
      throw new Error('Garmin账户信息未配置，请在环境变量中设置 GARMIN_EMAIL 和 GARMIN_PASSWORD');
    }

    await this.ensureLoggedIn();

    try {
      const days = date ? 1 : 7; // 如果指定日期则获取单日，否则获取7天
      
      const response = await fetch('/api/garmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync',
          days: days,
          force: false
        })
      });

      const result = await response.json();
      
      if (result.success && result.data.data) {
        return this.transformPythonDataToGarminData(result.data.data, date);
      } else {
        throw new Error(result.error || '数据同步失败');
      }
    } catch (error) {
      console.error('Garmin数据同步失败:', error);
      throw error;
    }
  }

  /**
   * 将Python返回的数据转换为GarminData格式
   */
  private transformPythonDataToGarminData(pythonData: any[], targetDate?: string): GarminData {
    const syncDate = targetDate || new Date().toISOString().split('T')[0];
    
    // 构建过去7天数据
    const last7Days = pythonData.map(dayData => ({
      date: dayData.date,
      totalCalories: dayData.totalCalories || 0,
      activeCalories: dayData.activeCalories || 0,
      bmrCalories: dayData.bmrCalories || 1800,
      steps: dayData.steps || 0
    }));

    // 获取目标日期的数据（最新的一天或指定日期）
    const targetDayData = targetDate 
      ? pythonData.find(d => d.date === targetDate) 
      : pythonData[pythonData.length - 1];

    if (!targetDayData) {
      throw new Error(`未找到日期 ${targetDate || '今日'} 的数据`);
    }

    // 转换活动数据
    const activities = (targetDayData.activities || []).map((activity: any) => ({
      name: activity.activityName || '未知活动',
      type: activity.activityType || 'unknown',
      duration: activity.duration || 0,
      calories: activity.calories || 0,
      distance: (activity.distance || 0) / 1000 // 转换为公里
    }));

    // 转换睡眠数据
    const sleepData = targetDayData.sleep || {};
    const sleep = {
      totalSleepTime: this.formatSecondsToHoursMinutes(sleepData.totalSleepTimeSeconds || 0),
      deepSleep: this.formatSecondsToHoursMinutes(sleepData.deepSleepSeconds || 0),
      lightSleep: this.formatSecondsToHoursMinutes(sleepData.lightSleepSeconds || 0),
      remSleep: this.formatSecondsToHoursMinutes(sleepData.remSleepSeconds || 0),
      awakeTime: this.formatSecondsToHoursMinutes(sleepData.awakeSleepSeconds || 0),
      sleepScore: 0, // Python库可能不提供睡眠评分
      hrv: {
        lastNightAvg: 0, // 需要从心率数据中获取
        status: 'unknown'
      }
    };

    return {
      userId: 'python-garmin-user',
      syncDate: syncDate,
      last7Days: last7Days,
      activities: activities,
      sleep: sleep,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * 将秒数转换为小时:分钟格式
   */
  private formatSecondsToHoursMinutes(seconds: number): string {
    if (!seconds || seconds === 0) return '0小时0分钟';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}小时${minutes}分钟`;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'Garmin账户信息未配置'
        };
      }

      await this.login();
      
      const response = await fetch('/api/garmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'user_info'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          message: 'Garmin Connect连接成功',
          data: result.data.user_info
        };
      } else {
        return {
          success: false,
          message: result.error || '连接测试失败'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
}

export const garminService = new GarminService();