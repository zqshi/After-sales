import { EventEmitter } from 'events';

export type ReviewRequestPayload = {
  reviewId: string;
  conversationId: string;
  suggestion: Record<string, unknown>;
  confidence?: number;
  createdAt: string | Date;
};

export class ReviewRequestStream {
  private static instance: ReviewRequestStream | null = null;
  private readonly emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(0);
  }

  static getInstance(): ReviewRequestStream {
    if (!ReviewRequestStream.instance) {
      ReviewRequestStream.instance = new ReviewRequestStream();
    }
    return ReviewRequestStream.instance;
  }

  emitRequested(payload: ReviewRequestPayload): void {
    this.emitter.emit('review_requested', payload);
  }

  onRequested(listener: (payload: ReviewRequestPayload) => void): void {
    this.emitter.on('review_requested', listener);
  }

  offRequested(listener: (payload: ReviewRequestPayload) => void): void {
    this.emitter.off('review_requested', listener);
  }
}
