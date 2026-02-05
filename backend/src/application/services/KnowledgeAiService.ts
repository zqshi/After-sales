import { LLMClient, LLMMessage } from '@infrastructure/ai/LLMClient';

export type GeneratedFaq = {
  question: string;
  answer: string;
};

export class KnowledgeAiService {
  private readonly llmClient: LLMClient;

  constructor() {
    this.llmClient = new LLMClient();
  }

  isEnabled(): boolean {
    return this.llmClient.isEnabled();
  }

  async generateSummary(title: string, content: string): Promise<string> {
    const trimmed = this.normalizeContent(content);
    if (!trimmed) {
      return '';
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          '你是专业的知识库摘要助手。请基于文档内容输出简洁摘要，80-120字，中文。',
      },
      {
        role: 'user',
        content: `文档标题：${title}\n\n文档内容：\n${trimmed}\n\n请仅输出JSON：{"summary":"..."}。`,
      },
    ];

    const response = await this.llmClient.generate(messages);
    const parsed = this.parseJson(response) as { summary?: string } | null;
    const summary = parsed?.summary ? String(parsed.summary).trim() : '';
    return summary;
  }

  async generateFaqs(
    title: string,
    content: string,
    count: number,
  ): Promise<GeneratedFaq[]> {
    const trimmed = this.normalizeContent(content);
    if (!trimmed || count < 1) {
      return [];
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          '你是知识库FAQ生成助手，请根据文档内容生成高质量FAQ。',
      },
      {
        role: 'user',
        content: `文档标题：${title}\n\n文档内容：\n${trimmed}\n\n请生成${count}条FAQ，输出JSON数组：` +
          `[{"question":"...","answer":"..."}]，不要输出多余内容。`,
      },
    ];

    const response = await this.llmClient.generate(messages);
    const parsed = this.parseJson(response);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const faqs = parsed as Array<{ question?: unknown; answer?: unknown }>;
    return faqs
      .map((item) => ({
        question: String(item?.question || '').trim(),
        answer: String(item?.answer || '').trim(),
      }))
      .filter((item) => item.question && item.answer);
  }

  async generateTags(
    title: string,
    content: string,
    maxTags = 10,
  ): Promise<string[]> {
    const trimmed = this.normalizeContent(content);
    if (!trimmed || maxTags < 1) {
      return [];
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          '你是知识库标签生成助手，请根据文档内容输出精炼标签。',
      },
      {
        role: 'user',
        content: `文档标题：${title}\n\n文档内容：\n${trimmed}\n\n请生成不超过${maxTags}个标签，输出JSON数组：["标签1","标签2"]，不要输出多余内容。`,
      },
    ];

    const response = await this.llmClient.generate(messages);
    const parsed = this.parseJson(response);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const tags = parsed
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    return this.normalizeTags(tags, maxTags);
  }

  private normalizeContent(content: string): string {
    const trimmed = String(content || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!trimmed) {
      return '';
    }
    return trimmed.slice(0, 6000);
  }

  private parseJson(raw: string): unknown {
    const text = String(raw || '').trim();
    if (!text) {
      return null;
    }
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  private normalizeTags(tags: string[], maxTags: number): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    tags.forEach((tag) => {
      const value = tag.replace(/\s+/g, ' ').trim();
      if (!value) {
        return;
      }
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      normalized.push(value);
    });
    return normalized.slice(0, maxTags);
  }
}
