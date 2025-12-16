export interface RequirementDetectionResult {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
}

interface DetectionRule {
  keywords: string[];
  category: string;
  priority: RequirementDetectionResult['priority'];
}

const RULES: DetectionRule[] = [
  {
    keywords: ['refund', 'return'],
    category: 'finance',
    priority: 'high',
  },
  {
    keywords: ['upgrade', 'feature'],
    category: 'product',
    priority: 'medium',
  },
  {
    keywords: ['bug', 'issue', 'error'],
    category: 'technical',
    priority: 'urgent',
  },
];

export class RequirementDetectorService {
  detect(message: string): RequirementDetectionResult {
    const normalized = message.toLowerCase();
    for (const rule of RULES) {
      if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
        return {
          category: rule.category,
          priority: rule.priority,
          source: 'conversation',
        };
      }
    }

    return {
      category: 'general',
      priority: 'medium',
      source: 'conversation',
    };
  }
}
