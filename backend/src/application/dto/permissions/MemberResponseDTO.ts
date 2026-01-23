export interface MemberResponseDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleId: string;
  team: string | null;
  badge: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}
