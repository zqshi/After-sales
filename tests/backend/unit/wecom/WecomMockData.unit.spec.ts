import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';

const fixtureRoot = path.resolve(process.cwd(), 'tests', 'wecom');

type GroupChatList = {
  errcode: number;
  errmsg: string;
  group_chat_list: Array<{ chat_id: string; status: number }>;
  next_cursor?: string;
};

type GroupChatDetails = {
  errcode: number;
  errmsg: string;
  group_chat_details: Record<string, { group_chat: any }>;
};

type GroupChatMessages = {
  errcode: number;
  errmsg: string;
  group_chat_messages: Record<string, Array<any>>;
};

type AppChatSendRequest = {
  chatid: string;
  msgtype: string;
  text?: { content: string };
  markdown?: { content: string };
  safe?: number;
};

async function readJson<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(fixtureRoot, filename), 'utf8');
  return JSON.parse(raw) as T;
}

describe('WeCom Mock Data Contract', () => {
  it('客户群列表数据格式正确', async () => {
    const data = await readJson<GroupChatList>('groupchat_list.json');
    expect(data.errcode).toBe(0);
    expect(data.errmsg).toBe('ok');
    expect(Array.isArray(data.group_chat_list)).toBe(true);
    expect(data.group_chat_list.length).toBeGreaterThan(0);
    for (const item of data.group_chat_list) {
      expect(typeof item.chat_id).toBe('string');
      expect([0, 1, 2, 3]).toContain(item.status);
    }
  });

  it('客户群详情数据与列表一致', async () => {
    const list = await readJson<GroupChatList>('groupchat_list.json');
    const details = await readJson<GroupChatDetails>('groupchat_details.json');

    for (const item of list.group_chat_list) {
      const detail = details.group_chat_details[item.chat_id];
      expect(detail).toBeDefined();
      expect(detail.group_chat.chat_id).toBe(item.chat_id);
      expect(typeof detail.group_chat.name).toBe('string');
      expect(typeof detail.group_chat.owner).toBe('string');
      expect(Array.isArray(detail.group_chat.member_list)).toBe(true);
    }
  });

  it('客户群消息数据覆盖列表中的 chat_id', async () => {
    const list = await readJson<GroupChatList>('groupchat_list.json');
    const messages = await readJson<GroupChatMessages>('groupchat_messages.json');

    for (const item of list.group_chat_list) {
      const groupMessages = messages.group_chat_messages[item.chat_id];
      expect(Array.isArray(groupMessages)).toBe(true);
      expect(groupMessages.length).toBeGreaterThan(0);
      for (const msg of groupMessages) {
        expect(typeof msg.sender_id).toBe('string');
        expect(['customer', 'agent']).toContain(msg.sender_type);
        expect(typeof msg.content).toBe('string');
        expect(typeof msg.sent_at).toBe('number');
      }
    }
  });

  it('应用推送消息请求体符合 msgtype 约束', async () => {
    const raw = await readFile(path.join(fixtureRoot, 'appchat_send_requests.json'), 'utf8');
    const requests = JSON.parse(raw) as AppChatSendRequest[];
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThan(0);

    for (const request of requests) {
      expect(typeof request.chatid).toBe('string');
      expect(['text', 'markdown']).toContain(request.msgtype);
      if (request.msgtype === 'text') {
        expect(typeof request.text?.content).toBe('string');
      }
      if (request.msgtype === 'markdown') {
        expect(typeof request.markdown?.content).toBe('string');
      }
    }
  });

  it('会话回调事件 XML 样例符合规范', async () => {
    const xml = await readFile(path.join(fixtureRoot, 'msgaudit_notify.xml'), 'utf8');
    const eventMatch = xml.match(/<Event><!\[CDATA\[(.*?)\]\]><\/Event>/);
    const msgTypeMatch = xml.match(/<MsgType><!\[CDATA\[(.*?)\]\]><\/MsgType>/);
    const toUserMatch = xml.match(/<ToUserName><!\[CDATA\[(.*?)\]\]><\/ToUserName>/);
    const fromUserMatch = xml.match(/<FromUserName><!\[CDATA\[(.*?)\]\]><\/FromUserName>/);

    expect(eventMatch?.[1]).toBe('msgaudit_notify');
    expect(msgTypeMatch?.[1]).toBe('event');
    expect(typeof toUserMatch?.[1]).toBe('string');
    expect(typeof fromUserMatch?.[1]).toBe('string');
  });
});
