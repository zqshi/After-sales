import { AggregateRoot } from '@domain/shared/AggregateRoot';
import { ContactInfo } from '../value-objects/ContactInfo';
import { CustomerLevelInfo } from '../value-objects/CustomerLevelInfo';
import { Metrics } from '../value-objects/Metrics';
import { Insight } from '../value-objects/Insight';
import { Interaction } from '../value-objects/Interaction';
import { ServiceRecord } from '../value-objects/ServiceRecord';
import { ProfileRefreshedEvent } from '../events/ProfileRefreshedEvent';
import { RiskLevelChangedEvent } from '../events/RiskLevelChangedEvent';
import { ServiceRecordAddedEvent } from '../events/ServiceRecordAddedEvent';
import { CommitmentProgressUpdatedEvent } from '../events/CommitmentProgressUpdatedEvent';
import { InteractionAddedEvent } from '../events/InteractionAddedEvent';
import { CustomerMarkedAsVIPEvent } from '../events/CustomerMarkedAsVIPEvent';
import { HealthScoreCalculator } from '../services/HealthScoreCalculator';
import { RiskEvaluator } from '../services/RiskEvaluator';

interface Commitment {
  id: string;
  title: string;
  progress: number;
}

interface CustomerProfileProps {
  customerId: string;
  name: string;
  contactInfo: ContactInfo;
  slaInfo: CustomerLevelInfo;
  metrics: Metrics;
  insights: Insight[];
  interactions: Interaction[];
  serviceRecords: ServiceRecord[];
  commitments: Commitment[];
  isVIP: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerProfile extends AggregateRoot<CustomerProfileProps> {
  private readonly healthCalculator: HealthScoreCalculator;
  private readonly riskEvaluator: RiskEvaluator;

  private constructor(
    props: CustomerProfileProps,
    healthCalculator: HealthScoreCalculator,
    riskEvaluator: RiskEvaluator,
    id?: string,
  ) {
    super(props, id);
    this.healthCalculator = healthCalculator;
    this.riskEvaluator = riskEvaluator;
  }

  static create(data: {
    customerId: string;
    name: string;
    contactInfo: ContactInfo;
    slaInfo: CustomerLevelInfo;
    metrics: Metrics;
    healthCalculator?: HealthScoreCalculator;
    riskEvaluator?: RiskEvaluator;
  }): CustomerProfile {
    const now = new Date();
    const profile = new CustomerProfile(
      {
        customerId: data.customerId,
        name: data.name,
        contactInfo: data.contactInfo,
        slaInfo: data.slaInfo,
        metrics: data.metrics,
        insights: [],
        interactions: [],
        serviceRecords: [],
        commitments: [],
        isVIP: false,
        riskLevel: 'low',
        createdAt: now,
        updatedAt: now,
      },
      data.healthCalculator ?? new HealthScoreCalculator(),
      data.riskEvaluator ?? new RiskEvaluator(),
    );

    profile.evaluateRiskLevel();
    return profile;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get name(): string {
    return this.props.name;
  }

  get contactInfo(): ContactInfo {
    return this.props.contactInfo;
  }

  get slaInfo(): CustomerLevelInfo {
    return this.props.slaInfo;
  }

  get metrics(): Metrics {
    return this.props.metrics;
  }

  get insights(): Insight[] {
    return [...this.props.insights];
  }

  get interactions(): Interaction[] {
    return [...this.props.interactions];
  }

  get serviceRecords(): ServiceRecord[] {
    return [...this.props.serviceRecords];
  }

  get commitments(): Commitment[] {
    return [...this.props.commitments];
  }

  get isVIP(): boolean {
    return this.props.isVIP;
  }

  get riskLevel(): 'low' | 'medium' | 'high' {
    return this.props.riskLevel;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  refresh(data: {
    metrics?: Metrics;
    insights?: Insight[];
    interactions?: Interaction[];
    serviceRecords?: ServiceRecord[];
  }, source: string): void {
    if (data.metrics) {
      this.props.metrics = data.metrics;
    }
    if (data.insights) {
      this.props.insights = [...this.props.insights, ...data.insights];
    }
    if (data.interactions) {
      this.props.interactions = [...this.props.interactions, ...data.interactions];
    }
    if (data.serviceRecords) {
      this.props.serviceRecords = [...this.props.serviceRecords, ...data.serviceRecords];
    }

    this.props.updatedAt = new Date();
    this.evaluateRiskLevel();

    this.addDomainEvent(
      new ProfileRefreshedEvent(
        { aggregateId: this.id },
        {
          customerId: this.customerId,
          refreshedAt: this.props.updatedAt,
          source,
        },
      ),
    );
  }

  addServiceRecord(data: {
    record: ServiceRecord;
  }): void {
    this.props.serviceRecords.push(data.record);
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ServiceRecordAddedEvent(
        { aggregateId: this.id },
        {
          customerId: this.customerId,
          recordId: data.record.id,
          title: data.record.title,
          recordedAt: data.record.recordedAt,
        },
      ),
    );
  }

  updateCommitmentProgress(commitmentId: string, progress: number): void {
    const index = this.props.commitments.findIndex((c) => c.id === commitmentId);
    if (index === -1) {
      this.props.commitments.push({
        id: commitmentId,
        title: 'Unknown',
        progress,
      });
    } else {
      const previousProgress = this.props.commitments[index].progress;
      this.props.commitments[index] = {
        ...this.props.commitments[index],
        progress,
      };
      this.addDomainEvent(
        new CommitmentProgressUpdatedEvent(
          { aggregateId: this.id },
          {
            customerId: this.customerId,
            commitmentId,
            previousProgress,
            currentProgress: progress,
            updatedAt: new Date(),
          },
        ),
      );
    }

    this.props.updatedAt = new Date();
  }

  addInteraction(interaction: Interaction): void {
    this.props.interactions.push(interaction);
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new InteractionAddedEvent(
        { aggregateId: this.id },
        {
          customerId: this.customerId,
          interactionId: interaction.occurredAt.toISOString(),
          interactionType: interaction.interactionType,
          occurredAt: interaction.occurredAt,
        },
      ),
    );

    this.evaluateRiskLevel();
  }

  markAsVIP(reason?: string): void {
    if (this.props.isVIP) {
      return;
    }
    this.props.isVIP = true;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new CustomerMarkedAsVIPEvent(
        { aggregateId: this.id },
        {
          customerId: this.customerId,
          markedAt: this.props.updatedAt,
          reason,
        },
      ),
    );
  }

  calculateHealthScore(): number {
    return this.healthCalculator.calculate({
      metrics: this.props.metrics,
      recentInteractions: this.props.interactions.length,
    });
  }

  evaluateRiskLevel(): void {
    const newLevel = this.riskEvaluator.evaluate({
      metrics: this.props.metrics,
      interactions: this.props.interactions,
    });

    if (newLevel !== this.props.riskLevel) {
      const previous = this.props.riskLevel;
      this.props.riskLevel = newLevel;
      this.addDomainEvent(
        new RiskLevelChangedEvent(
          { aggregateId: this.id },
          {
            customerId: this.customerId,
            previousLevel: previous,
            currentLevel: newLevel,
            evaluatedAt: new Date(),
          },
        ),
      );
    }
  }

  static rehydrate(
    props: CustomerProfileProps,
    id: string,
    healthCalculator: HealthScoreCalculator = new HealthScoreCalculator(),
    riskEvaluator: RiskEvaluator = new RiskEvaluator(),
  ): CustomerProfile {
    return new CustomerProfile(props, healthCalculator, riskEvaluator, id);
  }
}
