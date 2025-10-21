import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

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
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="top-center"
            richColors
            closeButton
            duration={4000}
          />
        </Providers>
      </body>
    </html>
  );
}