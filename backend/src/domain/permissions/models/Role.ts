import { PermissionKey } from '../../../config/permissions';

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: PermissionKey[];
  isSystem: boolean;
  status: string;
}
