/**
 * Garmin Connect 数据同步服务
 * 使用 garmin-connect 库进行模拟登录获取数据
 */

import { GarminConnect } from 'garmin-connect';

export interface GarminData {
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
    return !!(
      this.email && 
      this.password && 
      this.email !== 'your_garmin_email@example.com' &&
      this.password !== 'your_garmin_password' &&
      this.email.trim() !== '' &&
      this.password.trim() !== ''
    );
  }

  /**
   * 登录 Garmin Connect
   */
  async login(): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('未配置 Garmin 账号信息');
    }

    try {
      console.log('[DEBUG] GarminService: 正在登录 Garmin Connect...');
      
      this.client = new GarminConnect({
        username: this.email,
        password: this.password,
      });

      await this.client.login();
      this.isLoggedIn = true;
      
      console.log('[DEBUG] GarminService: Garmin 登录成功');
      return true;
    } catch (error) {
      console.error('[ERROR] GarminService: Garmin 登录失败:', error);
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
   * 同步指定日期的 Garmin 数据
   */
  async syncData(date?: string): Promise<GarminData> {
    await this.ensureLoggedIn();
    
    if (!this.client) {
      throw new Error('Garmin 客户端未初始化');
    }

    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    try {
      console.log('[DEBUG] GarminService: 开始同步数据，日期:', dateStr);

      // 获取每日统计数据
      const dailyStats = await this.client.getDailyStats(targetDate);
      console.log('[DEBUG] GarminService: 获取每日统计数据:', dailyStats);

      // 获取活动数据
      const activities = await this.client.getActivities(targetDate, 1);
      console.log('[DEBUG] GarminService: 获取活动数据:', activities);

      // 获取心率数据
      let heartRateData;
      try {
        heartRateData = await this.client.getHeartRate(targetDate);
      } catch (error) {
        console.warn('[WARN] GarminService: 获取心率数据失败:', error);
        heartRateData = null;
      }

      // 解析数据
      const parsedData = this.parseGarminData(dailyStats, activities, heartRateData, dateStr);
      
      console.log('[DEBUG] GarminService: 数据同步完成');
      return parsedData;

    } catch (error) {
      console.error('[ERROR] GarminService: 数据同步失败:', error);
      throw new Error(`数据同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析 Garmin 原始数据
   */
  private parseGarminData(
    stats: any, 
    activities: any[], 
    heartRateData: any, 
    dateStr: string
  ): GarminData {
    // 解析基础数据
    const totalCalories = stats?.totalKilocalories || 0;
    const activeCalories = stats?.activeKilocalories || 0;
    const restingCalories = stats?.bmrKilocalories || (totalCalories - activeCalories);
    const steps = stats?.totalSteps || 0;
    const distance = (stats?.totalDistanceMeters || 0) / 1000; // 转换为公里
    const floorsClimbed = stats?.floorsAscended || 0;

    // 解析心率数据
    const heartRate = {
      resting: heartRateData?.restingHeartRate || 0,
      average: heartRateData?.averageHeartRate || 0,
      max: heartRateData?.maxHeartRate || 0,
      zones: {
        zone1: heartRateData?.heartRateZones?.[0]?.timeInZone || 0,
        zone2: heartRateData?.heartRateZones?.[1]?.timeInZone || 0,
        zone3: heartRateData?.heartRateZones?.[2]?.timeInZone || 0,
        zone4: heartRateData?.heartRateZones?.[3]?.timeInZone || 0,
        zone5: heartRateData?.heartRateZones?.[4]?.timeInZone || 0,
      },
    };

    // 解析活动数据
    const activityList = activities.map((activity: any) => ({
      id: activity.activityId?.toString() || '',
      name: activity.activityName || '未知活动',
      type: activity.activityType?.typeKey || 'unknown',
      startTime: activity.startTimeLocal || '',
      duration: activity.duration || 0,
      calories: activity.calories || 0,
      distance: (activity.distance || 0) / 1000, // 转换为公里
    }));

    // 判断训练类型
    const trainingType = this.determineTrainingType(activityList);

    return {
      userId: 'personal-user', // 个人应用使用固定用户ID
      syncDate: dateStr,
      totalCalories,
      activeCalories,
      restingCalories,
      steps,
      distance,
      floorsClimbed,
      heartRate,
      activities: activityList,
      trainingType,
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * 判断训练类型
   */
  private determineTrainingType(activities: any[]): 'none' | 'A' | 'S' | 'both' {
    if (!activities || activities.length === 0) {
      return 'none';
    }

    let hasAerobic = false;
    let hasStrength = false;

    for (const activity of activities) {
      const type = activity.type?.toLowerCase() || '';
      const duration = activity.duration || 0;

      // 有氧运动类型
      if (
        type.includes('running') ||
        type.includes('cycling') ||
        type.includes('swimming') ||
        type.includes('cardio') ||
        type.includes('walking')
      ) {
        if (duration >= 20 * 60) { // 20分钟以上
          hasAerobic = true;
        }
      }

      // 力量训练类型
      if (
        type.includes('strength') ||
        type.includes('weight') ||
        type.includes('resistance') ||
        type.includes('gym')
      ) {
        if (duration >= 30 * 60) { // 30分钟以上
          hasStrength = true;
        }
      }
    }

    if (hasAerobic && hasStrength) {
      return 'both';
    } else if (hasAerobic) {
      return 'A';
    } else if (hasStrength) {
      return 'S';
    } else {
      return 'none';
    }
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
      
      // 获取今天的基础数据进行测试
      const today = new Date();
      const dailyStats = await this.client!.getDailyStats(today);
      
      return {
        success: true,
        message: 'Garmin Connect 连接测试成功',
        data: {
          totalCalories: dailyStats?.totalKilocalories || 0,
          steps: dailyStats?.totalSteps || 0,
          testTime: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }
}

// 导出单例实例
export const garminService = new GarminService();