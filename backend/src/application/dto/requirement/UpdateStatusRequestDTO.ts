export interface UpdateStatusRequestDTO {
  status: 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled';
}
