import { KnowledgeAiService } from '@application/services/KnowledgeAiService';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';
import { EventBus } from '@infrastructure/events/EventBus';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';

type FaqDraft = {
  question: string;
  answer: string;
};

export class FaqMiningService {
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly eventBus: EventBus,
    private readonly knowledgeAiService?: KnowledgeAiService,
  ) {}

  async generateForItem(item: KnowledgeItem): Promise<KnowledgeItem> {
    const metadata = item.metadata ?? {};
    const mining = this.normalizeMining(metadata.faqMining);
    if (!mining.enabled) {
      return item;
    }
    if (mining.status === 'completed' || mining.generatedAt) {
      return item;
    }

    const count = this.clampCount(mining.count);
    const drafts = await this.getFaqDrafts(item, count);
    const existingFaqs = await this.knowledgeRepository.findByFilters({ category: 'faq' });
    const existingQuestions = new Set(existingFaqs.map((faq) => this.normalizeText(faq.title)));
    const existingForDoc = existingFaqs.filter((faq) => {
      const faqMeta = faq.metadata;
      const sourceDocIds = Array.isArray(faqMeta?.sourceDocIds) ? faqMeta?.sourceDocIds : [];
      return sourceDocIds.includes(item.id);
    });

    if (existingForDoc.length) {
      const nextMetadata = {
        ...metadata,
        faqMining: {
          ...mining,
          status: 'completed',
          generatedAt: mining.generatedAt || new Date().toISOString(),
          generatedCount: existingForDoc.length,
        },
      };
      item.update({ metadata: nextMetadata });
      await this.knowledgeRepository.save(item);
      await this.eventBus.publishAll(item.getUncommittedEvents());
      item.clearEvents();
      return item;
    }

    let generatedCount = 0;
    for (const draft of drafts) {
      const normalizedQuestion = this.normalizeText(draft.question);
      if (!normalizedQuestion || existingQuestions.has(normalizedQuestion)) {
        continue;
      }

      const faqItem = KnowledgeItem.create({
        title: draft.question,
        content: draft.answer,
        category: KnowledgeCategory.create('faq'),
        tags: ['FAQ'],
        source: 'faq-mining',
        metadata: {
          status: 'active',
          sourceDocIds: [item.id],
          similarQuestions: [],
        },
      });

      await this.knowledgeRepository.save(faqItem);
      await this.eventBus.publishAll(faqItem.getUncommittedEvents());
      faqItem.clearEvents();
      generatedCount += 1;
    }

    const nextMetadata = {
      ...metadata,
      faqMining: {
        ...mining,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        generatedCount,
      },
    };

    item.update({ metadata: nextMetadata });
    await this.knowledgeRepository.save(item);
    await this.eventBus.publishAll(item.getUncommittedEvents());
    item.clearEvents();
    return item;
  }

  private normalizeMining(raw: unknown): {
    enabled: boolean;
    count: number;
    status?: string;
    generatedAt?: string;
  } {
    if (!raw || typeof raw !== 'object') {
      return { enabled: false, count: 0 };
    }
    const mining = raw as Record<string, unknown>;
    return {
      enabled: Boolean(mining.enabled),
      count: Number(mining.count ?? 0),
      status: typeof mining.status === 'string' ? mining.status : undefined,
      generatedAt: typeof mining.generatedAt === 'string' ? mining.generatedAt : undefined,
    };
  }

  private clampCount(count: number): number {
    if (!Number.isFinite(count) || count < 1) {
      return 5;
    }
    return Math.min(20, Math.max(1, Math.floor(count)));
  }

  private async getFaqDrafts(item: KnowledgeItem, count: number): Promise<FaqDraft[]> {
    if (this.knowledgeAiService?.isEnabled()) {
      const drafts = await this.knowledgeAiService.generateFaqs(item.title, item.content, count);
      if (drafts.length) {
        return drafts;
      }
    }

    return this.buildRuleBasedDrafts(item.title, item.content, count);
  }

  private buildRuleBasedDrafts(title: string, content: string, count: number): FaqDraft[] {
    const cleanTitle = (title || '文档').trim();
    const normalized = String(content || '').replace(/\r\n?/g, '\n').trim();
    if (!normalized) {
      return [];
    }

    const paragraphs = normalized
      .split(/\n{2,}/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const bullets = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.replace(/^-+\s*/, '').trim())
      .filter(Boolean);

    const drafts: FaqDraft[] = [];

    if (paragraphs[0]) {
      drafts.push({
        question: `《${cleanTitle}》主要讲了什么？`,
        answer: this.trimAnswer(paragraphs[0]),
      });
    }

    if (bullets.length) {
      const bulletAnswer = bullets.slice(0, Math.max(3, Math.min(count, bullets.length)))
        .map((item) => `- ${item}`)
        .join('\n');
      drafts.push({
        question: `《${cleanTitle}》的关键要点有哪些？`,
        answer: this.trimAnswer(bulletAnswer),
      });
    }

    if (paragraphs[1]) {
      drafts.push({
        question: `阅读《${cleanTitle}》需要注意什么？`,
        answer: this.trimAnswer(paragraphs[1]),
      });
    }

    if (paragraphs[2]) {
      drafts.push({
        question: `《${cleanTitle}》有哪些重要结论？`,
        answer: this.trimAnswer(paragraphs[2]),
      });
    }

    return drafts.slice(0, count);
  }

  private trimAnswer(text: string, maxLength = 600): string {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
    return `${trimmed.slice(0, maxLength)}...`;
  }

  private normalizeText(text: string): string {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim();
  }
}
