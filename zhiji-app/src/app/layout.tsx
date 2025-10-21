import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import { performanceMonitor } from '@/lib/performance-monitor';
import { log } from '@/lib/logger';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '脂记 - 智能减脂追踪应用',
  description: 'AI驱动的饮食分析，Garmin运动数据同步，科学的进度追踪，让减脂变得更简单、更有效',
  keywords: '减脂,健身,饮食记录,AI分析,Garmin同步,健康管理',
  authors: [{ name: '脂记团队' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0284c7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 在客户端初始化性能监控
  if (typeof window !== 'undefined') {
    // 记录应用启动
    log.info('Application started', {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    // 监控内存使用
    setTimeout(() => {
      performanceMonitor.logMemoryUsage();
    }, 1000);

    // 定期监控内存使用（每30秒）
    setInterval(() => {
      performanceMonitor.logMemoryUsage();
    }, 30000);
  }

  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster 
              position="top-center"
              richColors
              closeButton
              duration={4000}
            />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}