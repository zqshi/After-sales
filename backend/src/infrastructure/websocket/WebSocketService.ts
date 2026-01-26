/**
 * WebSocket服务 - 实时推送人工审核请求
 *
 * 功能：
 * 1. 管理WebSocket连接
 * 2. 推送审核请求给前端
 * 3. 接收审核结果
 * 4. 连接超时管理
 * 5. 心跳保活
 */

import { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';

export interface ReviewNotification {
  type: 'review_request';
  data: {
    reviewId: string;
    conversationId: string;
    customerId: string;
    customerName: string;
    message: string;
    suggestedReply: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: string;
  };
}

export interface ReviewResponse {
  type: 'review_response';
  data: {
    reviewId: string;
    action: 'approve' | 'reject' | 'modify';
    modifiedReply?: string;
    reason?: string;
  };
}

interface ConnectionInfo {
  socket: WebSocket;
  userId: string;
  connectedAt: number;
  lastActivity: number;
  heartbeatTimer?: NodeJS.Timeout;
}

export class WebSocketService {
  private connections: Map<string, ConnectionInfo> = new Map();
  private fastify: FastifyInstance;
  private cleanupTimer?: NodeJS.Timeout;

  // 配置
  private readonly CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30分钟无活动断开
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30秒心跳
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1分钟清理一次

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * 注册WebSocket路由
   */
  async register(): Promise<void> {
    await this.fastify.register(websocket);

    this.fastify.get('/ws/reviews', { websocket: true }, (connection, req) => {
      const userId = (req.user as any)?.id || 'anonymous';
      const socket = connection.socket;

      console.log(`WebSocket连接建立: ${userId}`);

      const connInfo: ConnectionInfo = {
        socket,
        userId,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.connections.set(userId, connInfo);

      // 启动心跳
      this.startHeartbeat(userId);

      socket.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.updateActivity(userId);
          this.handleMessage(userId, data);
        } catch (error) {
          console.error('WebSocket消息解析失败:', error);
        }
      });

      socket.on('close', () => {
        console.log(`WebSocket连接关闭: ${userId}`);
        this.removeConnection(userId);
      });

      socket.on('error', (error) => {
        console.error(`WebSocket错误 (${userId}):`, error);
        this.removeConnection(userId);
      });

      // 发送欢迎消息
      this.sendToConnection(connInfo, {
        type: 'connected',
        data: { message: '已连接到审核通知服务', userId },
      });
    });

    // 启动定期清理
    this.startCleanup();
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(userId: string): void {
    const connInfo = this.connections.get(userId);
    if (!connInfo) return;

    connInfo.heartbeatTimer = setInterval(() => {
      try {
        this.sendToConnection(connInfo, { type: 'ping', data: {} });
      } catch (error) {
        console.error(`心跳发送失败 (${userId}):`, error);
        this.removeConnection(userId);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * 更新活动时间
   */
  private updateActivity(userId: string): void {
    const connInfo = this.connections.get(userId);
    if (connInfo) {
      connInfo.lastActivity = Date.now();
    }
  }

  /**
   * 移除连接
   */
  private removeConnection(userId: string): void {
    const connInfo = this.connections.get(userId);
    if (connInfo) {
      if (connInfo.heartbeatTimer) {
        clearInterval(connInfo.heartbeatTimer);
      }
      try {
        connInfo.socket.close();
      } catch (error) {
        // 忽略关闭错误
      }
      this.connections.delete(userId);
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const toRemove: string[] = [];

      for (const [userId, connInfo] of this.connections.entries()) {
        // 检查超时
        if (now - connInfo.lastActivity > this.CONNECTION_TIMEOUT) {
          console.log(`连接超时，断开: ${userId}`);
          toRemove.push(userId);
        }
      }

      toRemove.forEach((userId) => this.removeConnection(userId));

      // 记录连接数
      if (this.connections.size > 0) {
        console.log(`当前WebSocket连接数: ${this.connections.size}`);
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // 关闭所有连接
    for (const userId of this.connections.keys()) {
      this.removeConnection(userId);
    }
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(userId: string, message: any): void {
    if (message.type === 'ping') {
      const connInfo = this.connections.get(userId);
      if (connInfo) {
        this.sendToConnection(connInfo, { type: 'pong', data: {} });
      }
    } else if (message.type === 'pong') {
      // 客户端响应心跳，更新活动时间
      this.updateActivity(userId);
    } else if (message.type === 'review_response') {
      // 处理审核响应
      this.handleReviewResponse(userId, message.data);
    }
  }

  /**
   * 处理审核响应
   */
  private async handleReviewResponse(userId: string, data: ReviewResponse['data']): Promise<void> {
    // 这里应该调用相应的Use Case来处理审核结果
    // 暂时只记录日志
    console.log(`收到审核响应 (${userId}):`, data);

    // TODO: 调用 ProcessReviewResponseUseCase
    // await this.processReviewResponseUseCase.execute({
    //   reviewId: data.reviewId,
    //   userId,
    //   action: data.action,
    //   modifiedReply: data.modifiedReply,
    //   reason: data.reason,
    // });
  }

  /**
   * 推送审核请求给所有在线的审核员
   */
  async notifyReviewRequest(notification: ReviewNotification): Promise<void> {
    let sentCount = 0;
    const toRemove: string[] = [];

    for (const [userId, connInfo] of this.connections.entries()) {
      try {
        this.sendToConnection(connInfo, notification);
        sentCount++;
      } catch (error) {
        console.error(`推送审核请求失败 (${userId}):`, error);
        toRemove.push(userId);
      }
    }

    toRemove.forEach((userId) => this.removeConnection(userId));

    console.log(`审核请求已推送给 ${sentCount} 个在线审核员`);
  }

  /**
   * 推送审核请求给特定用户
   */
  async notifyUser(userId: string, notification: ReviewNotification): Promise<boolean> {
    const connInfo = this.connections.get(userId);
    if (!connInfo) {
      console.log(`用户 ${userId} 不在线`);
      return false;
    }

    try {
      this.sendToConnection(connInfo, notification);
      return true;
    } catch (error) {
      console.error(`推送审核请求失败 (${userId}):`, error);
      this.removeConnection(userId);
      return false;
    }
  }

  /**
   * 发送消息到连接
   */
  private sendToConnection(connInfo: ConnectionInfo, message: any): void {
    if (connInfo.socket.readyState === WebSocket.OPEN) {
      connInfo.socket.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket not open');
    }
  }

  /**
   * 获取在线用户数
   */
  getOnlineCount(): number {
    return this.connections.size;
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    total: number;
    users: Array<{
      userId: string;
      connectedAt: number;
      lastActivity: number;
      idleTime: number;
    }>;
  } {
    const now = Date.now();
    const users = Array.from(this.connections.values()).map((connInfo) => ({
      userId: connInfo.userId,
      connectedAt: connInfo.connectedAt,
      lastActivity: connInfo.lastActivity,
      idleTime: now - connInfo.lastActivity,
    }));

    return {
      total: this.connections.size,
      users,
    };
  }
}
