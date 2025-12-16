import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

import { ConversationEntity } from './ConversationEntity';

@Entity('messages')
export class MessageEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ name: 'sender_id', type: 'varchar', length: 50 })
  senderId!: string;

  @Column({ name: 'sender_type', type: 'varchar', length: 20 })
  senderType!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 50, default: 'text' })
  contentType!: string;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamp' })
  sentAt!: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation!: ConversationEntity;
}
