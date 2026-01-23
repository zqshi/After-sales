export interface RoleResponseDTO {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  uiPermissions: Record<string, boolean>;
}
