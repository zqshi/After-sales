/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AgentScopeConfig } from '@config/agentscope.config';
import { DomainEvent } from '@domain/shared/DomainEvent';
import { EventBus } from '@infrastructure/events/EventBus';

import { EventFilter, defaultEventFilter } from './EventFilter';

interface AgentScopeInboundEvent {
  eventType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
  version?: number;
}

interface AgentScopeOutboundEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: string;
  version: number;
  payload: Record<string, unknown>;
}

class BridgeDomainEvent extends DomainEvent {
  constructor(raw: AgentScopeInboundEvent) {
    super(
      raw.eventType,
      {
        aggregateId: raw.aggregateId || 'external',
        occurredAt: raw.occurredAt ? new Date(raw.occurredAt) : new Date(),
        version: raw.version ?? 1,
      },
      raw.payload ?? {},
    );
  }
}

export class EventBridge {
  private readonly eventEndpoint: string;
  private readonly reverseEndpoint: string;
  private readonly timeoutMs: number;
  private readonly filter: EventFilter;

  constructor(
    private readonly app: FastifyInstance,
    private readonly eventBus: EventBus,
    private readonly config: AgentScopeConfig,
    filter?: EventFilter,
  ) {
    this.eventEndpoint = this.config.events.nodeToAgentPath;
    this.reverseEndpoint = this.config.events.agentToNodePath;
    this.timeoutMs = this.config.events.outboundTimeoutMs;
    this.filter = filter ?? defaultEventFilter;
  }

  async initialize(): Promise<void> {
    this.registerInboundRoute();
    this.subscribeOutboundEvents();
  }

  private subscribeOutboundEvents(): void {
    for (const eventType of this.filter.allowedEvents) {
      this.eventBus.subscribe(eventType, (event) => {
        if (this.filter.allows(event.eventType)) {
          void this.dispatchEventToAgent(event);
        }
      });
    }
  }

  private registerInboundRoute(): void {
    this.app.post(this.reverseEndpoint, async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Partial<AgentScopeInboundEvent>;
      if (!body?.eventType || !body.aggregateId) {
        reply.status(400).send({ error: 'eventType and aggregateId are required' });
        return;
      }

      try {
        const incomingEvent: AgentScopeInboundEvent = {
          eventType: body.eventType,
          aggregateId: body.aggregateId,
          payload: body.payload,
          occurredAt: body.occurredAt,
          version: body.version,
        };
        await this.publishInboundEvent(incomingEvent);
        reply.status(202).send({ status: 'published' });
      } catch (error) {
        this.app.log.error(
          { error, route: 'publishInbound' },
          '[EventBridge] Failed to publish inbound event',
        );
        reply.status(500).send({ error: 'internal error' });
      }
    });
  }

  private async publishInboundEvent(event: AgentScopeInboundEvent): Promise<void> {
    const wrappedEvent = new BridgeDomainEvent(event);
    await this.eventBus.publish(wrappedEvent);
  }

  private async dispatchEventToAgent(event: DomainEvent<object>): Promise<void> {
    const targetUrl = new URL(this.eventEndpoint, this.config.serviceUrl);
    const outbound: AgentScopeOutboundEvent = {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt.toISOString(),
      version: event.version,
      payload: event.payload as Record<string, unknown>,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outbound),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`unexpected status ${response.status}`);
      }
    } catch (error) {
      this.app.log.warn(
        {
          error,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
        },
        '[EventBridge] Failed to forward event',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
