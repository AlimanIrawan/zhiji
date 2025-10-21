'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Camera, 
  TrendingUp, 
  Activity, 
  Settings, 
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const navigation = [
  { name: '首页', href: '/', icon: Home },
  { name: '饮食记录', href: '/food', icon: Camera },
  { name: '进度分析', href: '/progress', icon: TrendingUp },
  { name: '设备同步', href: '/garmin', icon: Activity },
  { name: '个人设置', href: '/settings', icon: Settings },
];

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 添加调试日志
  useEffect(() => {
    console.log('[DEBUG] Navigation: 组件已挂载');
    console.log('[DEBUG] Navigation: 当前路径:', pathname);
    console.log('[DEBUG] Navigation: 可用路由:', navigation.map(n => n.href));
  }, []);

  useEffect(() => {
    console.log('[DEBUG] Navigation: 路径变化:', pathname);
    
    // 检查当前路径是否在导航列表中
    const currentRoute = navigation.find(nav => nav.href === pathname);
    if (currentRoute) {
      console.log('[DEBUG] Navigation: 找到匹配路由:', currentRoute.name);
    } else {
      console.warn('[DEBUG] Navigation: 未找到匹配路由，当前路径:', pathname);
    }
  }, [pathname]);

  // 添加链接点击处理函数
  const handleLinkClick = (href: string, name: string) => {
    console.log('[DEBUG] Navigation: 点击链接:', name, '目标:', href);
    console.log('[DEBUG] Navigation: 当前路径:', pathname);
    
    // 检查是否是当前页面
    if (pathname === href) {
      console.log('[DEBUG] Navigation: 已在目标页面，无需跳转');
      return;
    }
    
    try {
      console.log('[DEBUG] Navigation: 开始路由跳转...');
      // 这里不需要手动调用router.push，Link组件会处理
    } catch (error) {
      console.error('[DEBUG] Navigation: 路由跳转失败:', error);
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">脂</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">脂记</span>
              </Link>
            </div>

            <div className="flex items-center space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => handleLinkClick(item.href, item.name)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">个人应用</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">脂</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">脂记</span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center px-3 py-2">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-base text-gray-700">个人应用</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-5 h-16">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center space-y-1 ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-600'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}