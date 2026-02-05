/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
/**
 * 飞书IM适配器
 *
 * 实现飞书消息推送功能
 */

import { BaseIMAdapter, IMMessage, IMSendResult } from './BaseIMAdapter';

export class FeishuAdapter extends BaseIMAdapter {
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  getName(): string {
    return 'Feishu';
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 如果token未过期，直接返回
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    // 获取新token
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`获取飞书access_token失败: ${data.msg}`);
    }

    if (!data.tenant_access_token) {
      throw new Error('获取飞书access_token失败: token为空');
    }

    this.accessToken = data.tenant_access_token;
    // token有效期2小时，提前5分钟刷新
    this.tokenExpireTime = Date.now() + (data.expire - 300) * 1000;

    return this.accessToken!; // 非空断言，因为上面已经检查过了
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: string, message: IMMessage): Promise<IMSendResult> {
    if (!this.enabled) {
      return { success: false, error: 'Feishu adapter is disabled' };
    }

    try {
      const token = await this.getAccessToken();

      const payload: any = {
        receive_id: chatId,
        msg_type: message.messageType,
        content: JSON.stringify({
          text: message.content,
        }),
      };

      const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.code !== 0) {
        return {
          success: false,
          error: `飞书消息发送失败: ${data.msg}`,
        };
      }

      return {
        success: true,
        messageId: data.data.message_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 发送卡片消息
   */
  async sendCard(chatId: string, card: any): Promise<IMSendResult> {
    if (!this.enabled) {
      return { success: false, error: 'Feishu adapter is disabled' };
    }

    try {
      const token = await this.getAccessToken();

      const payload = {
        receive_id: chatId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      };

      const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.code !== 0) {
        return {
          success: false,
          error: `飞书卡片发送失败: ${data.msg}`,
        };
      }

      return {
        success: true,
        messageId: data.data.message_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://open.feishu.cn/open-apis/contact/v3/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`获取飞书用户信息失败: ${data.msg}`);
    }

    return data.data.user;
  }

  /**
   * 获取群聊信息
   */
  async getChatInfo(chatId: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/chats/${chatId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`获取飞书群聊信息失败: ${data.msg}`);
    }

    return data.data;
  }
}
