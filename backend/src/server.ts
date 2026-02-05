/**
 * 后端服务入口
 *
 * 初始化数据库连接，创建Fastify应用实例，注册所有路由
 */

import { createApp } from './app.js';
import { config } from './config/app.config.js';
import { AppDataSource } from './infrastructure/database/data-source.js';

let appInstance: Awaited<ReturnType<typeof createApp>> | null = null;

type AppDecorations = {
  outboxProcessor?: { stop(): void };
  tempDirCleaner?: { stop(): void };
};

const logInfo = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const logError = (message: string, error?: unknown): void => {
  const suffix = error ? ` ${String(error)}` : '';
  process.stderr.write(`${message}${suffix}\n`);
};

const start = async (): Promise<void> => {
  try {
    // 1. 初始化数据库连接
    logInfo('📦 正在连接数据库...');
    await AppDataSource.initialize();
    logInfo('✅ 数据库连接成功');

    // 2. 创建Fastify应用（包含所有路由）
    logInfo('🚀 正在初始化应用...');
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
    logError('❌ 服务器启动失败:', err);
    process.exit(1);
  }
};

// 优雅关闭
const shutdown = async (): Promise<void> => {
  logInfo('\n⏳ 正在关闭服务器...');
  const decorated = appInstance as (Awaited<ReturnType<typeof createApp>> & AppDecorations) | null;
  decorated?.outboxProcessor?.stop();
  decorated?.tempDirCleaner?.stop();
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  logInfo('✅ 服务器已关闭');
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

void start();
