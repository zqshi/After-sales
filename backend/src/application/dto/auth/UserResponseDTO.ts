export interface UserResponseDTO {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
