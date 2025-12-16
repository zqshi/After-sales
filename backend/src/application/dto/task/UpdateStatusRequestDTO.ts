export interface UpdateStatusRequestDTO {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}
