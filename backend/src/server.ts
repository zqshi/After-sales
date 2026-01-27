/**
 * 后端服务入口
 *
 * 初始化数据库连接，创建Fastify应用实例，注册所有路由
 */

import { createApp } from './app.js';
import { config } from './config/app.config.js';
import { AppDataSource } from './infrastructure/database/data-source.js';

let appInstance: Awaited<ReturnType<typeof createApp>> | null = null;

const start = async () => {
  try {
    // 1. 初始化数据库连接
    console.log('📦 正在连接数据库...');
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 2. 创建Fastify应用（包含所有路由）
    console.log('🚀 正在初始化应用...');
    const app = await createApp(AppDataSource);
    appInstance = app;

    // 3. 启动服务器
    const port = config.port;
    await app.listen({ port, host: '0.0.0.0' });

    app.log.info('========================================');
    app.log.info('🚀 服务器启动成功！');
    app.log.info(`📊 环境: ${config.env}`);
    app.log.info(`🌐 监听端口: ${port}`);
    app.log.info(`📝 日志级别: ${config.logLevel}`);
    app.log.info(`🗄️  数据库: ${config.database.host}:${config.database.port}/${config.database.name}`);
    app.log.info('========================================');

  } catch (err) {
    console.error('❌ 服务器启动失败:', err);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n⏳ 正在关闭服务器...');
  const outboxProcessor = (appInstance as any)?.outboxProcessor;
  if (outboxProcessor) {
    outboxProcessor.stop();
  }
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  console.log('✅ 服务器已关闭');
  process.exit(0);
});

start();
