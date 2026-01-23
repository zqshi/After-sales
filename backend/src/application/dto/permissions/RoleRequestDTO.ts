export interface CreateRoleRequestDTO {
  name: string;
  description?: string;
  uiPermissions?: string[];
}

export interface UpdateRoleRequestDTO {
  name?: string;
  description?: string;
  uiPermissions?: string[];
}
