/**
 * KnowledgeRecommender - 知识推荐领域服务
 */
export class KnowledgeRecommender {
  /**
   * 推荐知识条目
   * @param {KnowledgeItem[]} items
   * @param {Object} context
   */
  recommend(items = [], context = {}) {
    const limit = context.limit || 3;
    const tags = context.tags || [];
    const type = context.type;

    const scored = items
      .map(item => ({
        item,
        score: this._score(item, tags, type),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(entry => entry.item);

    return scored;
  }

  _score(item, tags, type) {
    let score = (item.rating?.score ?? 0) * 10;
    if (type && item.type === type) {
      score += 15;
    }
    if (tags.length) {
      score += tags.filter(tag => item.tags.includes(tag)).length * 5;
    }
    if (item.status === 'published') {
      score += 8;
    }
    return score;
  }
}
