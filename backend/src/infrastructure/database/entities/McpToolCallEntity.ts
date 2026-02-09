import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('mcp_tool_calls')
export class McpToolCallEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tool_name', type: 'varchar', length: 100 })
  toolName!: string;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId!: string | null;

  @Column({ name: 'customer_id', type: 'varchar', length: 50, nullable: true })
  customerId!: string | null;

  @Column({ name: 'agent_name', type: 'varchar', length: 100, nullable: true })
  agentName!: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'jsonb', default: {} })
  args!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  result!: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
