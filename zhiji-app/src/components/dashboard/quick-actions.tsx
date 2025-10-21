'use client';

import { Camera, Plus, Activity, Target } from 'lucide-react';
import Link from 'next/link';

const quickActions = [
  {
    title: '拍照记录',
    description: '拍摄食物照片',
    icon: Camera,
    href: '/food/add',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    title: '手动添加',
    description: '手动输入食物',
    icon: Plus,
    href: '/food/add?mode=manual',
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    title: '运动记录',
    description: '记录运动数据',
    icon: Activity,
    href: '/garmin',
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    title: '设定目标',
    description: '调整减脂目标',
    icon: Target,
    href: '/settings',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
];

export default function QuickActions() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
      <div className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className={`${action.color} text-white p-4 rounded-lg transition-colors group`}
          >
            <div className="flex flex-col items-center text-center">
              <action.icon className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="font-medium text-sm mb-1">{action.title}</h4>
              <p className="text-xs opacity-90">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}