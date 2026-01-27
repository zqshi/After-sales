import { DataSource } from 'typeorm';

import { ConversationEntity } from '@infrastructure/database/entities/ConversationEntity';
import { MessageEntity } from '@infrastructure/database/entities/MessageEntity';
import { TaskEntity } from '@infrastructure/database/entities/TaskEntity';

export interface ReportTrendSummary {
  labels: string[];
  conversationCounts: number[];
  firstResponseMinutes: Array<number | null>;
}

export interface ReportSummaryResponse {
  totalConversations: number;
  activeConversations: number;
  ticketsCreated: number;
  avgFirstResponseMinutes: number | null;
  firstResponseSlaRate: number | null;
  updateSyncRate: number | null;
  resolutionRate: number | null;
  satisfactionScore: number | null;
  violationCount: number;
  ticketsResolved: number;
  avgTicketHandleMinutes: number | null;
  escalationComplianceRate: number | null;
  trend: ReportTrendSummary;
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDateLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function average(values: number[]): number | null {
  if (!values.length) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function computeUpdateSyncCompliance(
  messages: Array<{ senderType: string; sentAt: Date }>,
): boolean | null {
  const sorted = messages.slice().sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  const customerStart = sorted.find((msg) => msg.senderType === 'customer')?.sentAt;
  const lastMessageAt = sorted.at(-1)?.sentAt;
  if (!customerStart || !lastMessageAt) {
    return null;
  }
  const agentTimes = sorted
    .filter((msg) => msg.senderType === 'agent' && msg.sentAt >= customerStart)
    .map((msg) => msg.sentAt.getTime());
  if (!agentTimes.length) {
    return false;
  }

  let windowStart = customerStart.getTime();
  const end = lastMessageAt.getTime();
  let agentIndex = 0;
  while (windowStart < end) {
    const windowEnd = windowStart + 30 * MINUTE_MS;
    while (agentIndex < agentTimes.length && agentTimes[agentIndex] < windowStart) {
      agentIndex += 1;
    }
    if (agentIndex >= agentTimes.length || agentTimes[agentIndex] > windowEnd) {
      return false;
    }
    windowStart = windowEnd;
  }

  return true;
}

export class GetReportSummaryUseCase {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async execute(days: number): Promise<ReportSummaryResponse> {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;
    const since = startOfDay(new Date(Date.now() - (safeDays - 1) * DAY_MS));

    const conversationRepo = this.dataSource.getRepository(ConversationEntity);
    const taskRepo = this.dataSource.getRepository(TaskEntity);
    const messageRepo = this.dataSource.getRepository(MessageEntity);

    const conversations = await conversationRepo
      .createQueryBuilder('conversation')
      .select([
        'conversation.id',
        'conversation.createdAt',
        'conversation.status',
        'conversation.closedAt',
        'conversation.slaStatus',
      ])
      .where('conversation.created_at >= :since', { since })
      .getMany();

    const totalConversations = conversations.length;
    const conversationIds = conversations.map((conversation) => conversation.id);
    const conversationCreatedAt = new Map(
      conversations.map((conversation) => [conversation.id, conversation.createdAt]),
    );

    const activeConversationsResult = await messageRepo
      .createQueryBuilder('message')
      .select('COUNT(DISTINCT message.conversation_id)', 'count')
      .where('message.sent_at >= :since', { since })
      .getRawOne();
    const activeConversations = Number(activeConversationsResult?.count ?? 0);

    const ticketsCreated = await taskRepo
      .createQueryBuilder('task')
      .where('task.created_at >= :since', { since })
      .getCount();

    const ticketsResolved = await taskRepo
      .createQueryBuilder('task')
      .where('task.completed_at >= :since', { since })
      .getCount();

    const ticketHandleResult = await taskRepo
      .createQueryBuilder('task')
      .select("AVG(EXTRACT(EPOCH FROM (task.completed_at - task.created_at)))", 'avgSeconds')
      .where('task.completed_at >= :since', { since })
      .andWhere('task.created_at IS NOT NULL')
      .getRawOne();
    const avgTicketHandleMinutes = ticketHandleResult?.avgSeconds
      ? Number(ticketHandleResult.avgSeconds) / MINUTE_MS
      : null;

    const satisfactionResult = await taskRepo
      .createQueryBuilder('task')
      .select('AVG(task.quality_score)', 'avgScore')
      .where('task.completed_at >= :since', { since })
      .andWhere('task.quality_score IS NOT NULL')
      .getRawOne();
    const satisfactionScore = satisfactionResult?.avgScore
      ? Number(satisfactionResult.avgScore)
      : null;

    const violationCount = conversations.filter((conversation) => conversation.slaStatus === 'violated').length;
    const resolvedCount = conversations.filter((conversation) => conversation.status === 'closed').length;
    const resolutionRate = totalConversations > 0 ? resolvedCount / totalConversations : null;

    let avgFirstResponseMinutes: number | null = null;
    let firstResponseSlaRate: number | null = null;
    let updateSyncRate: number | null = null;
    let escalationComplianceRate: number | null = null;

    if (conversationIds.length) {
      const responseRows = await this.dataSource.query(
        `
        SELECT m.conversation_id AS "conversationId",
               MIN(CASE WHEN m.sender_type = 'customer' THEN m.sent_at END) AS "customerFirst",
               MIN(CASE WHEN m.sender_type = 'agent' THEN m.sent_at END) AS "agentFirst"
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.created_at >= $1
        GROUP BY m.conversation_id
        `,
        [since],
      );

      const responseDurations: number[] = [];
      let slaHit = 0;
      for (const row of responseRows) {
        if (!row.customerFirst || !row.agentFirst) {
          continue;
        }
        const diffMinutes =
          (new Date(row.agentFirst).getTime() - new Date(row.customerFirst).getTime()) / MINUTE_MS;
        if (diffMinutes < 0) {
          continue;
        }
        responseDurations.push(diffMinutes);
        if (diffMinutes <= 5) {
          slaHit += 1;
        }
      }
      avgFirstResponseMinutes = average(responseDurations);
      firstResponseSlaRate = responseDurations.length ? slaHit / responseDurations.length : null;

      const messageRows = await this.dataSource.query(
        `
        SELECT m.conversation_id AS "conversationId",
               m.sender_type AS "senderType",
               m.sent_at AS "sentAt"
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.created_at >= $1
        ORDER BY m.conversation_id, m.sent_at
        `,
        [since],
      );

      const messagesByConversation = new Map<string, Array<{ senderType: string; sentAt: Date }>>();
      for (const row of messageRows) {
        const entry = messagesByConversation.get(row.conversationId) ?? [];
        entry.push({ senderType: row.senderType, sentAt: new Date(row.sentAt) });
        messagesByConversation.set(row.conversationId, entry);
      }

      let updateSyncEligible = 0;
      let updateSyncCompliant = 0;
      for (const [conversationId, messages] of messagesByConversation.entries()) {
        const compliance = computeUpdateSyncCompliance(messages);
        if (compliance === null) {
          continue;
        }
        updateSyncEligible += 1;
        if (compliance) {
          updateSyncCompliant += 1;
        }
      }
      updateSyncRate = updateSyncEligible ? updateSyncCompliant / updateSyncEligible : null;

      const taskRows = await taskRepo
        .createQueryBuilder('task')
        .select(['task.conversationId', 'task.createdAt'])
        .where('task.conversation_id IS NOT NULL')
        .andWhere('task.created_at >= :since', { since })
        .getMany();
      const taskCreatedMap = new Map<string, Date>();
      for (const task of taskRows) {
        if (!task.conversationId) {
          continue;
        }
        const current = taskCreatedMap.get(task.conversationId);
        if (!current || task.createdAt < current) {
          taskCreatedMap.set(task.conversationId, task.createdAt);
        }
      }

      let escalationEligible = 0;
      let escalationCompliant = 0;
      for (const conversation of conversations) {
        const convCreatedAt = conversation.createdAt;
        escalationEligible += 1;
        const taskCreatedAt = taskCreatedMap.get(conversation.id);
        if (taskCreatedAt) {
          const diffMinutes = (taskCreatedAt.getTime() - convCreatedAt.getTime()) / MINUTE_MS;
          if (diffMinutes >= 0 && diffMinutes <= 15) {
            escalationCompliant += 1;
          }
        }
      }
      escalationComplianceRate = escalationEligible ? escalationCompliant / escalationEligible : null;
    }

    const labels: string[] = [];
    for (let i = 0; i < safeDays; i += 1) {
      const date = new Date(since.getTime() + i * DAY_MS);
      labels.push(formatDateLabel(date));
    }

    const conversationCountsByDay = new Map<string, number>();
    const firstResponseByDay = new Map<string, number[]>();
    for (const conversation of conversations) {
      const label = formatDateLabel(conversation.createdAt);
      conversationCountsByDay.set(label, (conversationCountsByDay.get(label) ?? 0) + 1);
    }

    const responseRows = await this.dataSource.query(
      `
      SELECT m.conversation_id AS "conversationId",
             MIN(CASE WHEN m.sender_type = 'customer' THEN m.sent_at END) AS "customerFirst",
             MIN(CASE WHEN m.sender_type = 'agent' THEN m.sent_at END) AS "agentFirst"
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.created_at >= $1
      GROUP BY m.conversation_id
      `,
      [since],
    );

    for (const row of responseRows) {
      if (!row.customerFirst || !row.agentFirst) {
        continue;
      }
      const diffMinutes =
        (new Date(row.agentFirst).getTime() - new Date(row.customerFirst).getTime()) / MINUTE_MS;
      if (diffMinutes < 0) {
        continue;
      }
      const createdAt = conversationCreatedAt.get(row.conversationId);
      if (!createdAt) {
        continue;
      }
      const label = formatDateLabel(createdAt);
      const list = firstResponseByDay.get(label) ?? [];
      list.push(diffMinutes);
      firstResponseByDay.set(label, list);
    }

    const trend: ReportTrendSummary = {
      labels,
      conversationCounts: labels.map((label) => conversationCountsByDay.get(label) ?? 0),
      firstResponseMinutes: labels.map((label) => average(firstResponseByDay.get(label) ?? [])),
    };

    return {
      totalConversations,
      activeConversations,
      ticketsCreated,
      avgFirstResponseMinutes,
      firstResponseSlaRate,
      updateSyncRate,
      resolutionRate,
      satisfactionScore,
      violationCount,
      ticketsResolved,
      avgTicketHandleMinutes,
      escalationComplianceRate,
      trend,
    };
  }
}
