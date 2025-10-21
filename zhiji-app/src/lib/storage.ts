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
    // 动态导入 @vercel/kv 以避免在没有配置时出错
    try {
      const { kv } = require('@vercel/kv');
      this.kv = kv;
    } catch (error) {
      throw new Error('Vercel KV not available');
    }
  }

  async hgetall(key: string): Promise<Record<string, any> | null> {
    return await this.kv.hgetall(key);
  }

  async hset(key: string, data: Record<string, any>): Promise<void> {
    await this.kv.hset(key, data);
  }

  async get(key: string): Promise<string | null> {
    return await this.kv.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.kv.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.kv.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.kv.keys(pattern);
  }
}

// 存储工厂函数
function createStorage(): StorageAdapter {
  // 检查是否配置了 Vercel KV
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  
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