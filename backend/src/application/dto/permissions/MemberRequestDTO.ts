export interface CreateMemberRequestDTO {
  name: string;
  email: string;
  roleId: string;
}

export interface UpdateMemberRequestDTO {
  name?: string;
  email?: string;
  roleId?: string;
  status?: string;
}
