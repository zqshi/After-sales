import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';
import type { TaxKBDocument } from '../../adapters/TaxKBAdapter';

export class TaxKBMapper {
  static toKnowledgeItem(taxkbDoc: TaxKBDocument): KnowledgeItem {
    const category = this.mapCategory(taxkbDoc.category?.business_domain);
    const now = new Date();
    const createdAt = taxkbDoc.created_at ? new Date(taxkbDoc.created_at) : now;
    const updatedAt = taxkbDoc.updated_at ? new Date(taxkbDoc.updated_at) : now;

    return KnowledgeItem.rehydrate(
      {
        title: taxkbDoc.title,
        content: taxkbDoc.content || '',
        category,
        tags: this.flattenTags(taxkbDoc.tags),
        source: 'taxkb',
        metadata: {
          taxkbDocId: taxkbDoc.doc_id,
          status: taxkbDoc.status,
          fileHash: taxkbDoc.file_hash,
          pageCount: taxkbDoc.page_count,
          qualityScore: taxkbDoc.quality_score,
          companyEntity: taxkbDoc.category?.company_entity,
          businessDomain: taxkbDoc.category?.business_domain,
        },
        createdAt,
        updatedAt,
        isArchived: taxkbDoc.status === 'archived',
      },
      taxkbDoc.doc_id,
    );
  }

  static toTaxKBDocument(item: KnowledgeItem): Partial<TaxKBDocument> {
    const metadata = item.metadata as Record<string, unknown> | undefined;
    return {
      title: item.title,
      content: item.content,
      category: {
        company_entity:
          (typeof metadata?.companyEntity === 'string' ? metadata.companyEntity : undefined) ||
          'system',
        business_domain: this.reverseMapCategory(item.category),
      },
    };
  }

  private static mapCategory(businessDomain?: string): KnowledgeCategory {
    const mapping: Record<string, KnowledgeCategory> = {
      '员工关系/假期管理': KnowledgeCategory.create('policy'),
      '员工关系/员工服务': KnowledgeCategory.create('guide'),
      '员工关系/人事管理': KnowledgeCategory.create('policy'),
      '系统问题/登录异常': KnowledgeCategory.create('troubleshooting'),
      '系统问题/功能故障': KnowledgeCategory.create('troubleshooting'),
      '常见问题': KnowledgeCategory.create('faq'),
    };

    if (businessDomain && mapping[businessDomain]) {
      return mapping[businessDomain];
    }

    return KnowledgeCategory.create('other');
  }

  private static reverseMapCategory(category: KnowledgeCategory): string {
    const reverseMapping: Record<string, string> = {
      policy: '员工关系/假期管理',
      guide: '员工关系/员工服务',
      faq: '常见问题',
      troubleshooting: '系统问题/功能故障',
      product: '产品文档',
      other: '其他',
    };

    return reverseMapping[category.value] || '其他';
  }

  private static flattenTags(
    taxkbTags?: Record<string, Array<{ tag_id: string; name: string }>>,
  ): string[] {
    if (!taxkbTags) {
      return [];
    }

    const tags: string[] = [];
    Object.values(taxkbTags).forEach((dimensionTags) => {
      dimensionTags.forEach((tag) => {
        tags.push(tag.name);
      });
    });

    return tags;
  }
}
