import Fastify from 'fastify';
import { config } from './config/app.config.js';

const fastify = Fastify({
  logger: {
    level: config.logLevel
  }
});

// 健康检查端点
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  };
});

// 根路径
fastify.get('/', async () => {
  return {
    message: 'After-Sales Backend API',
    version: '0.1.0',
    environment: config.env
  };
});

// 启动服务器
const start = async () => {
  try {
    const port = config.port;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`🚀 服务器启动成功！`);
    fastify.log.info(`📊 环境: ${config.env}`);
    fastify.log.info(`🌐 监听端口: ${port}`);
    fastify.log.info(`📝 日志级别: ${config.logLevel}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
