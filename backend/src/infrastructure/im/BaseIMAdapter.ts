/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
/**
 * IM适配器基类
 *
 * 定义IM渠道（飞书、企微等）的统一接口
 */

export interface IMMessage {
  content: string;
  messageType: 'text' | 'image' | 'file' | 'card';
  mentions?: string[]; // @提及的用户
  replyTo?: string; // 回复的消息ID
}

export interface IMSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export abstract class BaseIMAdapter {
  protected appId: string;
  protected appSecret: string;
  protected enabled: boolean;

  constructor(config: { appId: string; appSecret: string; enabled?: boolean }) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.enabled = config.enabled ?? true;
  }

  /**
   * 发送消息
   */
  abstract sendMessage(chatId: string, message: IMMessage): Promise<IMSendResult>;

  /**
   * 发送文本消息（便捷方法）
   */
  async sendText(chatId: string, text: string): Promise<IMSendResult> {
    return this.sendMessage(chatId, {
      content: text,
      messageType: 'text',
    });
  }

  /**
   * 发送卡片消息
   */
  abstract sendCard(chatId: string, card: any): Promise<IMSendResult>;

  /**
   * 获取用户信息
   */
  abstract getUserInfo(userId: string): Promise<any>;

  /**
   * 获取群聊信息
   */
  abstract getChatInfo(chatId: string): Promise<any>;

  /**
   * 检查适配器是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取适配器名称
   */
  abstract getName(): string;
}
