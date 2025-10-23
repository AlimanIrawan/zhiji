/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // 设置输出文件跟踪根目录
  outputFileTracingRoot: __dirname,
  // 启用详细日志记录
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // 开发模式下的额外配置
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // 页面在内存中保持的时间（毫秒）
      maxInactiveAge: 25 * 1000,
      // 同时保持的页面数
      pagesBufferLength: 2,
    },
    // 启用更详细的构建输出
     webpack: (config, { dev, isServer }) => {
       if (dev) {
         // 使用默认的devtool，避免性能问题
         // config.devtool = 'eval-source-map';
         // 添加更多调试信息
         config.stats = 'normal';
       }
       return config;
     },
  }),
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    CUSTOM_KEY: 'my-value',
    // 添加调试标志
    DEBUG_MODE: process.env.NODE_ENV === 'development' ? 'true' : 'false',
  },
  // 重定向配置（用于调试）
  async redirects() {
    return [
      // 添加调试重定向，帮助诊断路由问题
    ];
  },
  // 重写配置（用于调试）
  async rewrites() {
    return [
      // 添加调试重写规则
    ];
  },
}

module.exports = nextConfig