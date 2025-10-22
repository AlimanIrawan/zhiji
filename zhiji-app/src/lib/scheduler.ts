// 调度器模块 - 用于管理自动同步任务

class Scheduler {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 设置每日自动同步任务
   * 每天晚上11:55执行同步
   */
  setupDailySync() {
    // 清除现有的定时器
    this.clearTimer('dailySync');

    const scheduleNextSync = () => {
      const now = new Date();
      const target = new Date();
      
      // 设置目标时间为今天的23:55
      target.setHours(23, 55, 0, 0);
      
      // 如果当前时间已经过了今天的23:55，则设置为明天的23:55
      if (now > target) {
        target.setDate(target.getDate() + 1);
      }
      
      const delay = target.getTime() - now.getTime();
      
      console.log(`[DEBUG] Scheduler: 下次自动同步时间: ${target.toLocaleString('zh-CN')}`);
      
      const timer = setTimeout(async () => {
        try {
          console.log('[DEBUG] Scheduler: 开始执行自动同步');
          
          // 调用自动同步API
          const response = await fetch('/api/garmin/auto-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          const result = await response.json();
          
          if (result.success) {
            console.log('[DEBUG] Scheduler: 自动同步成功完成');
            
            // 发送浏览器通知（如果用户允许）
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('脂记 - Garmin数据同步', {
                body: '今日运动数据已自动同步完成',
                icon: '/favicon.ico'
              });
            }
          } else {
            console.error('[ERROR] Scheduler: 自动同步失败:', result.error);
          }
        } catch (error) {
          console.error('[ERROR] Scheduler: 自动同步异常:', error);
        } finally {
          // 安排下一次同步
          scheduleNextSync();
        }
      }, delay);
      
      this.timers.set('dailySync', timer);
    };

    scheduleNextSync();
  }

  /**
   * 请求通知权限
   */
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log(`[DEBUG] Scheduler: 通知权限状态: ${permission}`);
      return permission === 'granted';
    }
    return false;
  }

  /**
   * 清除指定的定时器
   */
  clearTimer(name: string) {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
      console.log(`[DEBUG] Scheduler: 已清除定时器 ${name}`);
    }
  }

  /**
   * 清除所有定时器
   */
  clearAllTimers() {
    this.timers.forEach((timer, name) => {
      clearTimeout(timer);
      console.log(`[DEBUG] Scheduler: 已清除定时器 ${name}`);
    });
    this.timers.clear();
  }

  /**
   * 获取当前活跃的定时器列表
   */
  getActiveTimers() {
    return Array.from(this.timers.keys());
  }

  /**
   * 获取下次同步时间
   */
  getNextSyncTime() {
    const now = new Date();
    const target = new Date();
    
    // 设置目标时间为今天的23:55
    target.setHours(23, 55, 0, 0);
    
    // 如果当前时间已经过了今天的23:55，则设置为明天的23:55
    if (now > target) {
      target.setDate(target.getDate() + 1);
    }
    
    return target;
  }

  /**
   * 手动触发同步（用于测试）
   */
  async triggerManualSync() {
    try {
      console.log('[DEBUG] Scheduler: 手动触发同步');
      
      const response = await fetch('/api/garmin/auto-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[ERROR] Scheduler: 手动同步异常:', error);
      return {
        success: false,
        error: '手动同步失败'
      };
    }
  }
}

// 创建全局调度器实例
export const scheduler = new Scheduler();

// 在客户端环境中自动启动调度器
if (typeof window !== 'undefined') {
  // 页面加载时启动调度器
  scheduler.setupDailySync();
  
  // 请求通知权限
  scheduler.requestNotificationPermission();
  
  // 页面卸载时清理定时器
  window.addEventListener('beforeunload', () => {
    scheduler.clearAllTimers();
  });
}

export default Scheduler;