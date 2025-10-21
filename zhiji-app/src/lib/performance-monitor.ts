import { log } from './logger';

/**
 * 性能监控工具类
 * 用于监控页面加载、API响应、组件渲染等性能指标
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private timers: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 初始化性能观察器
   */
  private initializeObservers() {
    if (typeof window === 'undefined') return;

    try {
      // 监控导航性能
      if ('PerformanceObserver' in window) {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.logNavigationTiming(entry as PerformanceNavigationTiming);
            }
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);

        // 监控资源加载性能
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.logResourceTiming(entry as PerformanceResourceTiming);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);

        // 监控长任务
        if ('PerformanceObserver' in window && 'longtask' in PerformanceObserver.supportedEntryTypes) {
          const longTaskObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              this.logLongTask(entry);
            });
          });
          longTaskObserver.observe({ entryTypes: ['longtask'] });
          this.observers.push(longTaskObserver);
        }

        // 监控最大内容绘制 (LCP)
        if ('largest-contentful-paint' in PerformanceObserver.supportedEntryTypes) {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              log.performance('Largest Contentful Paint (LCP)', lastEntry.startTime, 'ms');
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          this.observers.push(lcpObserver);
        }

        // 监控首次输入延迟 (FID)
        if ('first-input' in PerformanceObserver.supportedEntryTypes) {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              const fidEntry = entry as any;
              log.performance('First Input Delay (FID)', fidEntry.processingStart - fidEntry.startTime, 'ms');
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
          this.observers.push(fidObserver);
        }

        // 监控累积布局偏移 (CLS)
        if ('layout-shift' in PerformanceObserver.supportedEntryTypes) {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            });
            
            // 定期报告 CLS 值
            if (clsValue > 0.1) { // 只报告较大的布局偏移
              log.performance('Cumulative Layout Shift (CLS)', clsValue);
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          this.observers.push(clsObserver);
        }
      }
    } catch (error) {
      log.error('Failed to initialize performance observers', error);
    }
  }

  /**
   * 记录导航性能
   */
  private logNavigationTiming(entry: PerformanceNavigationTiming) {
    const timing = {
      dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcpConnect: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      domProcessing: entry.domContentLoadedEventStart - entry.responseEnd,
      domComplete: entry.domComplete - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.fetchStart
    };

    log.info('Page Navigation Timing', timing);
  }

  private logResourceTiming(entry: PerformanceResourceTiming) {
    const duration = entry.responseEnd - entry.startTime;
    
    // 只记录较慢的资源加载
    if (duration > 1000) { // 超过1秒
      log.warn('Slow Resource Loading', {
        url: entry.name,
        duration: `${duration.toFixed(2)}ms`,
        type: this.getResourceType(entry.name),
        size: entry.transferSize || 'unknown'
      });
    }
  }

  private logLongTask(entry: PerformanceEntry) {
    log.warn('Long Task Detected', {
      duration: `${entry.duration.toFixed(2)}ms`,
      startTime: `${entry.startTime.toFixed(2)}ms`,
      name: entry.name || 'unknown'
    });
  }

  /**
   * 开始计时
   */
  public startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * 结束计时并记录
   */
  public endTimer(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      log.warn(`Timer "${name}" was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    log.performance(`Timer: ${name}`, duration, 'ms');
    
    if (metadata) {
      log.info(`Timer metadata for ${name}`, metadata);
    }

    return duration;
  }

  public async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      log.performance(`Async Function: ${name}`, duration, 'ms');
      
      if (metadata) {
        log.info(`Async function metadata for ${name}`, metadata);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      log.performance(`Async Function: ${name}`, duration, 'ms');
      log.error(`Async function ${name} failed`, error, metadata);
      throw error;
    }
  }

  public measure<T>(
    name: string, 
    fn: () => T, 
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      log.performance(`Function: ${name}`, duration, 'ms');
      
      if (metadata) {
        log.info(`Function metadata for ${name}`, metadata);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      log.performance(`Function: ${name}`, duration, 'ms');
      log.error(`Function ${name} failed`, error, metadata);
      throw error;
    }
  }

  public logMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      log.info('Memory Usage', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      });
    }
  }

  /**
   * 获取首次内容绘制时间
   */
  private getFirstContentfulPaint(): string {
    if (typeof window !== 'undefined') {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry ? `${fcpEntry.startTime.toFixed(2)}ms` : 'unknown';
    }
    return 'unknown';
  }

  /**
   * 获取导航类型
   */
  private getNavigationType(type: number): string {
    const types = ['navigate', 'reload', 'back_forward', 'prerender'];
    return types[type] || 'unknown';
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * 清理观察器
   */
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.timers.clear();
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 便捷函数
export const startTimer = (name: string) => performanceMonitor.startTimer(name);
export const endTimer = (name: string, metadata?: Record<string, any>) => 
  performanceMonitor.endTimer(name, metadata);
export const measureAsync = <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => 
  performanceMonitor.measureAsync(name, fn, metadata);
export const measure = <T>(name: string, fn: () => T, metadata?: Record<string, any>) => 
  performanceMonitor.measure(name, fn, metadata);
export const logMemoryUsage = () => performanceMonitor.logMemoryUsage();