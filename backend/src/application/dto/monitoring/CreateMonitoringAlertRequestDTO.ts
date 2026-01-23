export interface CreateMonitoringAlertRequestDTO {
  level: 'info' | 'warning' | 'critical';
  title: string;
  message?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}
