import { taxkbConfig } from '@config/taxkb.config';

export interface TaxKBDocument {
  doc_id: string;
  title: string;
  content: string;
  status: 'draft' | 'active' | 'pending_review' | 'archived' | 'deprecated';
  category: {
    company_entity: string;
    business_domain: string;
  };
  tags: Record<string, Array<{ tag_id: string; name: string }>>;
  file_hash: string;
  page_count: number;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface TaxKBSearchResult {
  doc_id: string;
  title: string;
  score: number;
  match_reason: {
    query_mode: string;
    match: string;
    score?: number;
  };
}

export interface TaxKBSemanticResult {
  doc_id: string;
  chunk_id: string;
  score: number;
  match_reason: string;
  content: string;
}

export interface TaxKBQAPair {
  question: string;
  answer: string;
  score: number;
  doc_id: string;
}

export interface TaxKBProcessingStatus {
  overall_status: string;
  overall_progress: number;
  tasks: Array<{ task: string; progress: number; status: string }>;
}

export class TaxKBError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'TaxKBError';
  }
}

export class TaxKBAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = taxkbConfig.baseUrl;
    this.apiKey = taxkbConfig.apiKey;
    this.timeout = taxkbConfig.timeout;

    if (!taxkbConfig.enabled) {
      console.warn('[TaxKB] integration disabled by configuration');
    }
  }

  async uploadDocument(
    file: Buffer,
    metadata?: {
      title?: string;
      category?: { company_entity?: string; business_domain?: string };
    },
  ): Promise<TaxKBDocument> {
    const arrayBuffer = new Uint8Array(file).buffer;
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob);

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.request<TaxKBDocument>('/documents', {
      method: 'POST',
      body: formData,
    });
  }

  async getDocument(
    docId: string,
    options?: {
      include?: ('tags' | 'fulltext' | 'sections' | 'metadata')[];
    },
  ): Promise<TaxKBDocument> {
    const params = new URLSearchParams();
    if (options?.include) {
      params.append('include', options.include.join(','));
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.request<TaxKBDocument>(`/documents/${docId}${suffix}`);
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.request<void>(`/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  async searchDocuments(
    query: string,
    filters?: {
      status?: string[];
      category?: { company_entity?: string[]; business_domain?: string[] };
      tags?: Array<{ dimension: string; values: string[] }>;
      limit?: number;
    },
  ): Promise<TaxKBSearchResult[]> {
    const payload = {
      query,
      query_mode: 'filename',
      status_filter: filters?.status || ['active'],
      category_filter: filters?.category,
      tag_filter: filters?.tags,
      limit: filters?.limit || 20,
    };

    const response = await this.request<{ total: number; documents: TaxKBSearchResult[] }>(
      '/search/documents',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

    return response.documents;
  }

  async semanticSearch(
    query: string,
    options?: { docIds?: string[]; topK?: number; includeChunks?: boolean },
  ): Promise<TaxKBSemanticResult[]> {
    const response = await this.request<{
      document_chunk_results: TaxKBSemanticResult[];
      qa_pair_results: TaxKBQAPair[];
    }>('/search/semantic', {
      method: 'POST',
      body: JSON.stringify({
        query,
        query_mode: ['document_chunk'],
        doc_ids: options?.docIds,
        top_k: options?.topK || 5,
        include: {
          chunks: options?.includeChunks ?? true,
        },
      }),
    });

    return response.document_chunk_results;
  }

  async searchQA(
    question: string,
    filters?: { doc_ids?: string[]; top_k?: number },
  ): Promise<TaxKBQAPair[]> {
    const response = await this.request<{ answers: TaxKBQAPair[] }>('/search/qa', {
      method: 'POST',
      body: JSON.stringify({
        query: question,
        doc_filter: filters?.doc_ids ? { doc_ids: filters.doc_ids } : undefined,
        top_k: filters?.top_k || 5,
      }),
    });

    return response.answers;
  }

  async getProcessingProgress(docId: string): Promise<TaxKBProcessingStatus> {
    return this.request<TaxKBProcessingStatus>(`/documents/${docId}/processing`);
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!taxkbConfig.enabled) {
      throw new TaxKBError('TaxKB integration is disabled', 503);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const isJsonBody = typeof options?.body === 'string';
      const isFormData = options?.body instanceof FormData;
      const headers = new Headers(options?.headers ?? {});

      headers.set('X-API-Key', this.apiKey);
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }

      if (isFormData) {
        headers.delete('Content-Type');
      } else if (isJsonBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = await this.parseError(response);
        throw new TaxKBError(
          errorPayload.message || 'TaxKB API request failed',
          response.status,
          errorPayload,
        );
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TaxKBError) {
        throw error;
      }
      if ((error as Error).name === 'AbortError') {
        throw new TaxKBError('Request timeout', 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseError(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      const text = await response.text();
      return { message: text || 'Unknown error' };
    }
  }
}
