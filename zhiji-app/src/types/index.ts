// 用户相关类型定义
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  height: number;
  currentWeight: number;
  targetWeight: number;
  dailyCalorieGoal: number;
  activityLevel: 'low' | 'moderate' | 'high';
  createdAt: string;
  updatedAt: string;
}

// 饮食记录类型定义 (已废弃，使用下面的新定义)
// export interface FoodRecord {
//   id: string;
//   recordDate: string;
//   recordTime: string;
//   description: string;
//   calories: number;
//   protein: number;
//   carbs: number;
//   fat: number;
//   aiAdvice: string;
//   imageUrl?: string;
//   createdAt: string;
// }

// Garmin数据类型定义 (已废弃，使用下面的新定义)
// export interface GarminData {
//   syncDate: string;
//   totalCalories: number;
//   activeCalories: number;
//   steps: number;
//   heartRate: {
//     resting: number;
//     max: number;
//     average: number;
//   };
//   activities: Array<{
//     name: string;
//     type: string;
//     duration: number;
//     calories: number;
//   }>;
//   trainingType: 'none' | 'A' | 'S' | 'both';
//   syncedAt: string;
// }

// 每日汇总类型定义
// 旧的DailySummary定义 (已废弃，使用下面的新定义)
// export interface DailySummary {
//   summaryDate: string;
//   totalCaloriesIn: number;
//   totalCaloriesOut: number;
//   totalProtein: number;
//   totalCarbs: number;
//   totalFat: number;
//   trainingType: string;
//   weightChange: number;
//   createdAt: string;
//   updatedAt: string;
// }

// API响应类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 食物分析API响应
export interface FoodAnalysisResponse {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  advice: string;
}

// Garmin同步API响应
export interface GarminSyncResponse {
  totalCalories: number;
  steps: number;
  heartRate: {
    resting: number;
    max: number;
    average: number;
  };
  activities: Array<{
    name: string;
    type: string;
    duration: number;
    calories: number;
  }>;
}

// 移除NextAuth类型扩展，因为不再使用认证系统

// 组件Props类型
export interface DashboardCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export interface ChartDataPoint {
  date: string;
  calories: number;
  weight?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

// 表单类型定义
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileFormData {
  name: string;
  height: number;
  currentWeight: number;
  targetWeight: number;
  dailyCalorieGoal: number;
  activityLevel: 'low' | 'moderate' | 'high';
}

// 状态管理类型
export interface AppState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface FoodState {
  records: FoodRecord[];
  isAnalyzing: boolean;
  selectedDate: string;
}

export interface GarminState {
  data: GarminData | null;
  isSync: boolean;
  lastSyncTime: string | null;
}



// 新增类型定义
export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  userId?: string;
}

// 食物分析相关类型
export interface FoodAnalysisRequest {
  image?: string; // Base64 编码的图片
  description?: string; // 文字描述
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

// 心率数据类型定义
export interface HeartRateData {
  resting: number;
  max: number;
  average: number;
  zones?: {
    zone1: number; // 恢复区间
    zone2: number; // 有氧基础区间
    zone3: number; // 有氧区间
    zone4: number; // 乳酸阈值区间
    zone5: number; // 无氧区间
  };
}

// 活动数据类型定义
export interface ActivityData {
  id: string;
  name: string;
  type: string;
  startTime: string;
  duration: number; // 分钟
  calories: number;
  distance?: number; // 公里
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPace?: string; // 配速 mm:ss/km
}

// 扩展 FoodRecord 接口
export interface FoodRecord {
  id: string;
  userId: string;
  recordDate: string; // YYYY-MM-DD
  recordTime: string; // HH:mm
  description: string;
  nutrition: NutritionInfo;
  aiAdvice?: string;
  imageUrl?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  createdAt: string;
  updatedAt: string;
}

// 扩展 GarminData 接口
export interface GarminData {
  userId: string;
  syncDate: string; // YYYY-MM-DD
  totalCalories: number;
  activeCalories: number;
  restingCalories: number;
  steps: number;
  distance: number; // 公里
  floorsClimbed?: number;
  heartRate: HeartRateData;
  activities: ActivityData[];
  trainingType: 'none' | 'A' | 'S' | 'both'; // A=有氧, S=力量
  syncedAt: string;
}

// 每日汇总类型定义
export interface DailySummary {
  userId: string;
  summaryDate: string; // YYYY-MM-DD
  nutrition: {
    totalCaloriesIn: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
  };
  activity: {
    totalCaloriesOut: number;
    activeCalories: number;
    steps: number;
    distance: number;
    trainingType: string;
  };
  balance: {
    calorieDeficit: number; // 热量缺口 (消耗 - 摄入)
    proteinGoalMet: boolean;
    stepsGoalMet: boolean;
  };
  weight?: {
    morning?: number;
    evening?: number;
    change?: number; // 相比前一天的变化
  };
  createdAt: string;
  updatedAt: string;
}

// 组件Props类型
export interface DashboardCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ProgressChartData {
  weight: ChartDataPoint[];
  calories: ChartDataPoint[];
  protein: ChartDataPoint[];
  steps: ChartDataPoint[];
}

// 表单类型定义
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileFormData {
  name: string;
  height: number;
  currentWeight: number;
  targetWeight: number;
  dailyCalorieGoal: number;
  activityLevel: 'low' | 'moderate' | 'high';
}

// 状态管理类型
export interface AppState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface FoodState {
  records: FoodRecord[];
  isAnalyzing: boolean;
  selectedDate: string;
}

export interface GarminState {
  data: GarminData | null;
  isSync: boolean;
  lastSyncTime: string | null;
}

// 工具类型
export type DateString = string; // YYYY-MM-DD format
export type TimeString = string; // HH:mm format
export type ActivityLevel = 'low' | 'moderate' | 'high';
export type TrainingType = 'none' | 'A' | 'S' | 'both';

// 组件和状态管理类型
export interface DashboardStats {
  todayCaloriesIn: number;
  todayCaloriesOut: number;
  calorieGoal: number;
  proteinIntake: number;
  proteinGoal: number;
  stepsToday: number;
  stepsGoal: number;
  currentWeight: number;
  targetWeight: number;
  weeklyProgress: number; // kg lost this week
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ProgressChartData {
  weight: ChartDataPoint[];
  calories: ChartDataPoint[];
  protein: ChartDataPoint[];
  steps: ChartDataPoint[];
}

// 表单状态类型
export interface FoodRecordForm {
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  image?: File;
  manualEntry: boolean;
  nutrition?: Partial<NutritionInfo>;
}

export interface UserProfileForm {
  name: string;
  height: number;
  currentWeight: number;
  targetWeight: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goals?: any;
}

// 应用状态类型
export interface AppState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // 数据状态
  todayRecords: FoodRecord[];
  recentSummaries: DailySummary[];
  garminData: GarminData | null;
  
  // UI 状态
  sidebarOpen: boolean;
  currentView: 'dashboard' | 'food' | 'progress' | 'sync' | 'settings';
  
  // 操作方法
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  addFoodRecord: (record: FoodRecord) => void;
  syncGarminData: () => Promise<void>;
}