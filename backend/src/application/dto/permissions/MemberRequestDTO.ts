export interface CreateMemberRequestDTO {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  roleId: string;
  team?: string;
  badge?: string;
}

export interface UpdateMemberRequestDTO {
  name?: string;
  email?: string;
  phone?: string;
  roleId?: string;
  team?: string;
  badge?: string;
  status?: string;
}
