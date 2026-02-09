import { config } from '@config/app.config';

type TicketCreateRequest = Record<string, unknown>;
type TicketListRequest = Record<string, unknown>;

export class WorkorderClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.workorder.baseUrl;
  }

  private buildHeaders(): Record<string, string> {
    if (!config.workorder.appId || !config.workorder.appSecret) {
      throw new Error('Workorder auth not configured');
    }
    const timestamp = Date.now().toString();
    const sign = this.buildSign(timestamp);
    if (!sign) {
      throw new Error('Workorder sign is empty. Configure WORKORDER_APP_ID/SECRET and implement buildSign.');
    }
    return {
      AppId: config.workorder.appId,
      Timestamp: timestamp,
      Sign: sign,
      'Content-Type': 'application/json',
    };
  }

  // TODO: 根据实际签名规则替换
  private buildSign(_timestamp: string): string {
    return '';
  }

  private async request(path: string, options: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(config.workorder.timeout),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.errmsg || payload?.error || response.statusText;
      throw new Error(`Workorder request failed: ${message}`);
    }
    return payload;
  }

  async createTicket(payload: TicketCreateRequest): Promise<any> {
    const headers = this.buildHeaders();
    return this.request('/workorder/api/ticket/create', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  async listTickets(payload: TicketListRequest): Promise<any> {
    const headers = this.buildHeaders();
    return this.request('/workorder/api/ticket/list_tickets', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  async getTicketDetail(id: string | number): Promise<any> {
    const headers = this.buildHeaders();
    const query = new URLSearchParams({ id: String(id) }).toString();
    return this.request(`/workorder/api/ticket/detail?${query}`, {
      method: 'GET',
      headers,
    });
  }
}
