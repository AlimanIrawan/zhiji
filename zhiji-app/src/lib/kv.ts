import { storage } from '@/lib/storage';
import { 
  UserProfile, 
  FoodRecord, 
  GarminData, 
  DailySummary,
  NutritionInfo,
  HeartRateData,
  ActivityData
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

// 用户服务类
export class UserService {
  // 获取用户资料
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileKey = `user:${userId}:profile`;
      const profile = await storage.hgetall(profileKey);
      
      if (!profile || Object.keys(profile).length === 0) {
        return null;
      }

      return {
        id: profile.id as string,
        email: profile.email as string,
        name: profile.name as string,
        avatar: profile.avatar as string,
        height: Number(profile.height) || 170,
        currentWeight: Number(profile.currentWeight) || 70,
        targetWeight: Number(profile.targetWeight) || 65,
        age: Number(profile.age),
        gender: profile.gender as 'male' | 'female' | 'other',
        activityLevel: profile.activityLevel as any || 'moderate',
        goals: profile.goals ? JSON.parse(profile.goals as string) : {
          dailyCalories: 2000,
          dailyProtein: 120,
          dailyCarbs: 250,
          dailyFat: 67,
          dailySteps: 10000,
          weeklyWeightLoss: 0.5
        },
        preferences: profile.preferences ? JSON.parse(profile.preferences as string) : {
          units: 'metric',
          language: 'zh',
          timezone: 'Asia/Shanghai',
          notifications: {
            mealReminders: true,
            workoutReminders: true,
            progressUpdates: true
          },
          privacy: {
            shareProgress: false,
            allowAnalytics: true
          }
        },
        garminConnected: Boolean(profile.garminConnected),
        garminUserId: profile.garminUserId as string,
        garminAccessToken: profile.garminAccessToken as string,
        createdAt: profile.createdAt as string,
        updatedAt: profile.updatedAt as string,
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // 更新用户资料
  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const profileKey = `user:${userId}:profile`;
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // 序列化复杂对象
      if (updates.goals) {
        updateData.goals = JSON.stringify(updates.goals);
      }
      if (updates.preferences) {
        updateData.preferences = JSON.stringify(updates.preferences);
      }

      await storage.hset(profileKey, updateData);
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  // 删除用户数据
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const keys = [
        `user:${userId}:profile`,
        `auth:email:*`, // 需要通过邮箱查找
        `user:${userId}:foods:*`,
        `user:${userId}:foods:index`,
        `user:${userId}:garmin:*`,
        `user:${userId}:summary:*`,
      ];

      // 删除所有相关键
      for (const keyPattern of keys) {
        if (keyPattern.includes('*')) {
          // 对于包含通配符的键，需要先查找再删除
          const matchingKeys = await storage.keys(keyPattern);
          if (matchingKeys.length > 0) {
            for (const key of matchingKeys) {
              await storage.del(key);
            }
          }
        } else {
          await storage.del(keyPattern);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}

// 食物记录服务类
export class FoodService {
  // 保存食物记录
  static async saveFoodRecord(record: Omit<FoodRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    try {
      const recordId = uuidv4();
      const now = new Date().toISOString();
      const date = record.recordDate;
      
      const fullRecord: FoodRecord = {
        ...record,
        id: recordId,
        createdAt: now,
        updatedAt: now,
      };

      const recordKey = `user:${record.userId}:foods:${date}`;
      
      // 保存记录 - 使用简化的存储方式
      await storage.hset(recordKey, { [recordId]: JSON.stringify(fullRecord) });

      return recordId;
    } catch (error) {
      console.error('Error saving food record:', error);
      return null;
    }
  }

  // 获取指定日期的食物记录
  static async getFoodRecords(userId: string, date: string): Promise<FoodRecord[]> {
    try {
      const recordKey = `user:${userId}:foods:${date}`;
      const records = await storage.hgetall(recordKey);
      
      if (!records || Object.keys(records).length === 0) {
        return [];
      }

      return Object.values(records)
        .map(record => JSON.parse(record as string) as FoodRecord)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      console.error('Error getting food records:', error);
      return [];
    }
  }

  // 获取用户最近的食物记录
  static async getRecentFoodRecords(userId: string, limit: number = 20): Promise<FoodRecord[]> {
    try {
      // 简化实现：获取最近几天的记录
      const records: FoodRecord[] = [];
      const today = new Date();
      
      for (let i = 0; i < 7 && records.length < limit; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRecords = await this.getFoodRecords(userId, dateStr);
        records.push(...dayRecords);
      }

      return records
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent food records:', error);
      return [];
    }
  }

  // 更新食物记录
  static async updateFoodRecord(userId: string, recordId: string, updates: Partial<FoodRecord>): Promise<boolean> {
    try {
      // 简化实现：遍历最近几天查找记录
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const recordKey = `user:${userId}:foods:${dateStr}`;
        const records = await storage.hgetall(recordKey);
        
        if (records && records[recordId]) {
          const record = JSON.parse(records[recordId] as string) as FoodRecord;
          const updatedRecord = {
            ...record,
            ...updates,
            updatedAt: new Date().toISOString(),
          };

          await storage.hset(recordKey, { [recordId]: JSON.stringify(updatedRecord) });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error updating food record:', error);
      return false;
    }
  }

  // 删除食物记录
  static async deleteFoodRecord(userId: string, recordId: string): Promise<boolean> {
    try {
      // 简化实现：遍历最近几天查找并删除记录
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const recordKey = `user:${userId}:foods:${dateStr}`;
        const records = await storage.hgetall(recordKey);
        
        if (records && records[recordId]) {
          delete records[recordId];
          await storage.hset(recordKey, records);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error deleting food record:', error);
      return false;
    }
  }

  // 计算指定日期的营养汇总
  static async calculateDailyNutrition(userId: string, date: string): Promise<NutritionInfo> {
    try {
      const records = await this.getFoodRecords(userId, date);
      
      const summary: NutritionInfo = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      };

      records.forEach(record => {
        summary.calories += record.nutrition.calories || 0;
        summary.protein += record.nutrition.protein || 0;
        summary.carbs += record.nutrition.carbs || 0;
        summary.fat += record.nutrition.fat || 0;
        summary.fiber += record.nutrition.fiber || 0;
        summary.sugar += record.nutrition.sugar || 0;
        summary.sodium += record.nutrition.sodium || 0;
      });

      return summary;
    } catch (error) {
      console.error('Error calculating daily nutrition:', error);
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      };
    }
  }
}

// Garmin数据服务类
export class GarminService {
  // 保存Garmin数据
  static async saveGarminData(data: Omit<GarminData, 'syncedAt'>): Promise<boolean> {
    try {
      const garminKey = `user:${data.userId}:garmin:${data.syncDate}`;
      const fullData: GarminData = {
        ...data,
        syncedAt: new Date().toISOString(),
      };

      await storage.hset(garminKey, {
        userId: data.userId,
        syncDate: data.syncDate,
        totalCalories: data.totalCalories.toString(),
        activeCalories: data.activeCalories.toString(),
        restingCalories: data.restingCalories.toString(),
        steps: data.steps.toString(),
        distance: data.distance.toString(),
        floorsClimbed: (data.floorsClimbed || 0).toString(),
        heartRate: JSON.stringify(data.heartRate),
        activities: JSON.stringify(data.activities),
        trainingType: data.trainingType,
        syncedAt: fullData.syncedAt,
      });

      return true;
    } catch (error) {
      console.error('Error saving Garmin data:', error);
      return false;
    }
  }

  // 获取指定日期的Garmin数据
  static async getGarminData(userId: string, date: string): Promise<GarminData | null> {
    try {
      const garminKey = `user:${userId}:garmin:${date}`;
      const data = await storage.hgetall(garminKey);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        userId: data.userId as string,
        syncDate: data.syncDate as string,
        totalCalories: Number(data.totalCalories) || 0,
        activeCalories: Number(data.activeCalories) || 0,
        restingCalories: Number(data.restingCalories) || 0,
        steps: Number(data.steps) || 0,
        distance: Number(data.distance) || 0,
        floorsClimbed: Number(data.floorsClimbed) || 0,
        heartRate: data.heartRate ? JSON.parse(data.heartRate as string) : { resting: 0, max: 0, average: 0 },
        activities: data.activities ? JSON.parse(data.activities as string) : [],
        trainingType: data.trainingType as any || 'none',
        syncedAt: data.syncedAt as string,
      };
    } catch (error) {
      console.error('Error getting Garmin data:', error);
      return null;
    }
  }

  // 获取用户最近的Garmin数据
  static async getRecentGarminData(userId: string, days: number = 7): Promise<GarminData[]> {
    try {
      const data: GarminData[] = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const garminData = await this.getGarminData(userId, dateStr);
        if (garminData) {
          data.push(garminData);
        }
      }

      return data.sort((a, b) => new Date(b.syncDate).getTime() - new Date(a.syncDate).getTime());
    } catch (error) {
      console.error('Error getting recent Garmin data:', error);
      return [];
    }
  }
}

// 汇总服务类
export class SummaryService {
  // 保存每日汇总
  static async saveDailySummary(summary: DailySummary): Promise<boolean> {
    try {
      const summaryKey = `user:${summary.userId}:summary:${summary.summaryDate}`;
      
      await storage.hset(summaryKey, {
        userId: summary.userId,
        summaryDate: summary.summaryDate,
        nutrition: JSON.stringify(summary.nutrition),
        activity: JSON.stringify(summary.activity),
        balance: JSON.stringify(summary.balance),
        weight: summary.weight ? JSON.stringify(summary.weight) : '',
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
      });

      return true;
    } catch (error) {
      console.error('Error saving daily summary:', error);
      return false;
    }
  }

  // 获取每日汇总
  static async getDailySummary(userId: string, date: string): Promise<DailySummary | null> {
    try {
      const summaryKey = `user:${userId}:summary:${date}`;
      const data = await storage.hgetall(summaryKey);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        userId: data.userId as string,
        summaryDate: data.summaryDate as string,
        nutrition: JSON.parse(data.nutrition as string),
        activity: JSON.parse(data.activity as string),
        balance: JSON.parse(data.balance as string),
        weight: data.weight ? JSON.parse(data.weight as string) : undefined,
        createdAt: data.createdAt as string,
        updatedAt: data.updatedAt as string,
      };
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return null;
    }
  }

  // 获取最近的汇总数据
  static async getRecentSummaries(userId: string, days: number = 7): Promise<DailySummary[]> {
    try {
      const summaries: DailySummary[] = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const summary = await this.getDailySummary(userId, dateStr);
        if (summary) {
          summaries.push(summary);
        }
      }

      return summaries.sort((a, b) => new Date(b.summaryDate).getTime() - new Date(a.summaryDate).getTime());
    } catch (error) {
      console.error('Error getting recent summaries:', error);
      return [];
    }
  }
}

// 认证服务类
export class AuthService {
  // 通过邮箱获取用户ID
  static async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      const userKey = `auth:email:${email}`;
      const userData = await storage.hgetall(userKey);
      return userData?.id as string || null;
    } catch (error) {
      console.error('Error getting user ID by email:', error);
      return null;
    }
  }

  // 验证用户凭据
  static async validateCredentials(email: string, password: string): Promise<string | null> {
    try {
      const userKey = `auth:email:${email}`;
      const userData = await storage.hgetall(userKey);
      
      if (!userData || !userData.password) {
        return null;
      }

      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare(password, userData.password as string);
      
      return isValid ? userData.id as string : null;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return null;
    }
  }

  // 更新用户密码
  static async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      // 首先获取用户邮箱
      const profile = await UserService.getProfile(userId);
      if (!profile) {
        return false;
      }

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const userKey = `auth:email:${profile.email}`;
      await storage.hset(userKey, {
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }
}