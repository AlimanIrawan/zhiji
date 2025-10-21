// 本地开发存储适配器
// 在没有配置 Vercel KV 时提供内存存储作为备用方案

interface StorageAdapter {
  hgetall(key: string): Promise<Record<string, any> | null>;
  hset(key: string, data: Record<string, any>): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

// 内存存储实现（仅用于本地开发）
class MemoryStorage implements StorageAdapter {
  private data: Map<string, any> = new Map();

  async hgetall(key: string): Promise<Record<string, any> | null> {
    const value = this.data.get(key);
    return value || null;
  }

  async hset(key: string, data: Record<string, any>): Promise<void> {
    this.data.set(key, data);
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const keys = Array.from(this.data.keys());
    // 简单的模式匹配，支持 * 通配符
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }
}

// Vercel KV 适配器
class VercelKVAdapter implements StorageAdapter {
  private kv: any;

  constructor() {
    // 设置环境变量映射 - @vercel/kv 包需要标准的环境变量名称
    const zhijiKvUrl = process.env.ZHIJI_KV_REST_API_URL;
    const zhijiKvToken = process.env.ZHIJI_KV_REST_API_TOKEN;
    
    if (zhijiKvUrl && zhijiKvToken) {
      // 将自定义环境变量映射到 @vercel/kv 包期望的标准名称
      process.env.KV_REST_API_URL = zhijiKvUrl;
      process.env.KV_REST_API_TOKEN = zhijiKvToken;
      console.log('Environment variables mapped for @vercel/kv:', {
        from: 'ZHIJI_KV_*',
        to: 'KV_*',
        hasUrl: !!zhijiKvUrl,
        hasToken: !!zhijiKvToken
      });
    }
    
    // 动态导入 @vercel/kv 以避免在没有配置时出错
    try {
      const { kv } = require('@vercel/kv');
      this.kv = kv;
      console.log('Vercel KV adapter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Vercel KV adapter:', error);
      throw new Error('Vercel KV not available');
    }
  }

  async hgetall(key: string): Promise<Record<string, any> | null> {
    try {
      const result = await this.kv.hgetall(key);
      console.log(`KV hgetall ${key}:`, result ? 'found' : 'not found');
      return result;
    } catch (error) {
      console.error(`KV hgetall error for key ${key}:`, error);
      throw error;
    }
  }

  async hset(key: string, data: Record<string, any>): Promise<void> {
    try {
      await this.kv.hset(key, data);
      console.log(`KV hset ${key}: success`);
    } catch (error) {
      console.error(`KV hset error for key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const result = await this.kv.get(key);
      console.log(`KV get ${key}:`, result ? 'found' : 'not found');
      return result;
    } catch (error) {
      console.error(`KV get error for key ${key}:`, error);
      throw error;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.kv.set(key, value);
      console.log(`KV set ${key}: success`);
    } catch (error) {
      console.error(`KV set error for key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.kv.del(key);
      console.log(`KV del ${key}: success`);
    } catch (error) {
      console.error(`KV del error for key ${key}:`, error);
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const result = await this.kv.keys(pattern);
      console.log(`KV keys ${pattern}: found ${result.length} keys`);
      return result;
    } catch (error) {
      console.error(`KV keys error for pattern ${pattern}:`, error);
      throw error;
    }
  }
}

// 存储工厂函数
function createStorage(): StorageAdapter {
  // 检查是否配置了 Vercel KV - 使用正确的环境变量名称
  const kvUrl = process.env.ZHIJI_KV_REST_API_URL;
  const kvToken = process.env.ZHIJI_KV_REST_API_TOKEN;
  
  console.log('Environment check:', {
    kvUrl: kvUrl ? 'configured' : 'not configured',
    kvToken: kvToken ? 'configured' : 'not configured',
    nodeEnv: process.env.NODE_ENV
  });
  
  if (kvUrl && kvToken && 
      kvUrl !== 'your_kv_rest_api_url' && 
      kvToken !== 'your_kv_rest_api_token') {
    try {
      console.log('Using Vercel KV storage');
      return new VercelKVAdapter();
    } catch (error) {
      console.warn('Vercel KV not available, falling back to memory storage:', error);
    }
  }
  
  console.log('Using memory storage for local development');
  return new MemoryStorage();
}

// 导出单例存储实例
export const storage = createStorage();