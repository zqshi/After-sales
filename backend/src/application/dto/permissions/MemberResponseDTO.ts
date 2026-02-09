export interface MemberResponseDTO {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}
