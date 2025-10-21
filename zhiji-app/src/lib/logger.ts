/**
 * 应用日志工具类
 * 提供统一的日志记录功能，支持不同级别的日志输出
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  stack?: string;
  location?: string;
}

class Logger {
  private isDevelopment: boolean;
  private currentLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  /**
   * 获取调用位置信息
   */
  private getCallerLocation(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // 跳过 Error、getCallerLocation、log方法本身
    const callerLine = lines[4] || lines[3] || lines[2];
    
    if (!callerLine) return 'unknown';
    
    // 提取文件名和行号
    const match = callerLine.match(/at\s+.*\s+\((.+):(\d+):(\d+)\)/) || 
                  callerLine.match(/at\s+(.+):(\d+):(\d+)/);
    
    if (match) {
      const [, file, line] = match;
      const fileName = file.split('/').pop() || file;
      return `${fileName}:${line}`;
    }
    
    return 'unknown';
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * 创建日志条目
   */
  private createLogEntry(level: string, message: string, data?: any, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      location: this.getCallerLocation(),
    };

    if (data !== undefined) {
      entry.data = data;
    }

    if (error) {
      entry.stack = error.stack;
    }

    return entry;
  }

  /**
   * 输出日志到控制台
   */
  private output(entry: LogEntry, consoleMethod: 'log' | 'info' | 'warn' | 'error' = 'log') {
    if (!this.isDevelopment && entry.level === 'DEBUG') {
      return; // 生产环境不输出 DEBUG 日志
    }

    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.location}]`;
    
    if (this.isDevelopment) {
      // 开发环境：详细输出
      console[consoleMethod](`${prefix} ${entry.message}`);
      if (entry.data !== undefined) {
        console[consoleMethod]('Data:', entry.data);
      }
      if (entry.stack) {
        console[consoleMethod]('Stack:', entry.stack);
      }
    } else {
      // 生产环境：简化输出
      if (entry.level === 'ERROR' || entry.level === 'WARN') {
        console[consoleMethod](`${prefix} ${entry.message}`);
        if (entry.data !== undefined) {
          console[consoleMethod]('Data:', entry.data);
        }
      }
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, data?: any) {
    if (this.currentLevel <= LogLevel.DEBUG) {
      const entry = this.createLogEntry('DEBUG', message, data);
      this.output(entry, 'log');
    }
  }

  /**
   * INFO 级别日志
   */
  info(message: string, data?: any) {
    if (this.currentLevel <= LogLevel.INFO) {
      const entry = this.createLogEntry('INFO', message, data);
      this.output(entry, 'info');
    }
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, data?: any) {
    if (this.currentLevel <= LogLevel.WARN) {
      const entry = this.createLogEntry('WARN', message, data);
      this.output(entry, 'warn');
    }
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, error?: Error | any, data?: any) {
    if (this.currentLevel <= LogLevel.ERROR) {
      const entry = this.createLogEntry('ERROR', message, data, error instanceof Error ? error : undefined);
      this.output(entry, 'error');
    }
  }

  /**
   * 记录API请求
   */
  apiRequest(method: string, url: string, data?: any) {
    this.info(`API Request: ${method} ${url}`, data);
  }

  /**
   * 记录API响应
   */
  apiResponse(method: string, url: string, status: number, duration: number, data?: any) {
    const message = `API Response: ${method} ${url} - ${status} (${duration}ms)`;
    if (status >= 400) {
      this.error(message, undefined, data);
    } else {
      this.info(message, data);
    }
  }

  /**
   * 记录用户操作
   */
  userAction(action: string, data?: any) {
    this.info(`User Action: ${action}`, data);
  }

  /**
   * 记录性能指标
   */
  performance(metric: string, value: number, unit: string = 'ms') {
    this.info(`Performance: ${metric} = ${value}${unit}`);
  }

  /**
   * 记录组件生命周期
   */
  componentLifecycle(component: string, lifecycle: string, data?: any) {
    this.debug(`Component: ${component} - ${lifecycle}`, data);
  }

  /**
   * 记录数据库操作
   */
  database(operation: string, table?: string, data?: any) {
    this.debug(`Database: ${operation}${table ? ` on ${table}` : ''}`, data);
  }

  /**
   * 记录外部服务调用
   */
  externalService(service: string, operation: string, data?: any) {
    this.info(`External Service: ${service} - ${operation}`, data);
  }
}

// 创建全局日志实例
export const logger = new Logger();

// 导出便捷方法
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: Error | any, data?: any) => logger.error(message, error, data),
  
  // 专用方法
  apiRequest: (method: string, url: string, data?: any) => logger.apiRequest(method, url, data),
  apiResponse: (method: string, url: string, status: number, duration: number, data?: any) => 
    logger.apiResponse(method, url, status, duration, data),
  userAction: (action: string, data?: any) => logger.userAction(action, data),
  performance: (metric: string, value: number, unit?: string) => logger.performance(metric, value, unit),
  componentLifecycle: (component: string, lifecycle: string, data?: any) => 
    logger.componentLifecycle(component, lifecycle, data),
  database: (operation: string, table?: string, data?: any) => logger.database(operation, table, data),
  externalService: (service: string, operation: string, data?: any) => 
    logger.externalService(service, operation, data),
};

export default logger;