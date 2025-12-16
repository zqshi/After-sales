export interface KnowledgeRecommendation {
  knowledgeId: string;
  score: number;
}

export class KnowledgeRecommender {
  recommendByKeywords(
    knowledgeItems: { id: string; title: string; tags: string[]; category: string }[],
    keywords: string[],
  ): KnowledgeRecommendation[] {
    const normalized = keywords.map((keyword) => keyword.toLowerCase().trim());

    return knowledgeItems
      .map((item) => {
        const matchCount = normalized.reduce((acc, keyword) => {
          const inTitle = item.title.toLowerCase().includes(keyword);
          const inTags = item.tags.some((tag) => tag.toLowerCase().includes(keyword));
          return acc + (inTitle || inTags ? 1 : 0);
        }, 0);

        return {
          knowledgeId: item.id,
          score: matchCount + (item.category === 'faq' ? 0.5 : 0),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}
