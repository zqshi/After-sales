export type PermissionKey =
  | 'customers.read'
  | 'customers.write'
  | 'requirements.read'
  | 'requirements.write'
  | 'requirements.delete'
  | 'tasks.read'
  | 'tasks.write'
  | 'tasks.assign'
  | 'tasks.complete'
  | 'knowledge.read'
  | 'knowledge.write'
  | 'conversations.read'
  | 'conversations.write'
  | 'im.read'
  | 'im.write'
  | 'ai.use'
  | 'audit.read'
  | 'audit.write'
  | 'monitoring.read'
  | 'monitoring.write'
  | 'session.read'
  | 'session.write';

const ALL_PERMISSIONS: PermissionKey[] = [
  'customers.read',
  'customers.write',
  'requirements.read',
  'requirements.write',
  'requirements.delete',
  'tasks.read',
  'tasks.write',
  'tasks.assign',
  'tasks.complete',
  'knowledge.read',
  'knowledge.write',
  'conversations.read',
  'conversations.write',
  'im.read',
  'im.write',
  'ai.use',
  'audit.read',
  'audit.write',
  'monitoring.read',
  'monitoring.write',
  'session.read',
  'session.write',
];

const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: ALL_PERMISSIONS,
  manager: [
    'customers.read',
    'requirements.read',
    'requirements.write',
    'tasks.read',
    'tasks.write',
    'tasks.assign',
    'tasks.complete',
    'knowledge.read',
    'conversations.read',
    'conversations.write',
    'im.read',
    'im.write',
    'ai.use',
    'audit.read',
    'monitoring.read',
    'session.read',
  ],
  agent: [
    'customers.read',
    'requirements.read',
    'requirements.write',
    'tasks.read',
    'tasks.write',
    'knowledge.read',
    'conversations.read',
    'conversations.write',
    'im.read',
    'im.write',
    'ai.use',
    'session.read',
  ],
};

export function getRolePermissions(role: string | undefined): PermissionKey[] {
  if (!role) {
    return [];
  }
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermissions(role: string | undefined, required: PermissionKey[]): boolean {
  if (!required.length) {
    return true;
  }
  if (role === 'admin') {
    return true;
  }
  const available = new Set(getRolePermissions(role));
  return required.every((permission) => available.has(permission));
}

export function listAllPermissions(): PermissionKey[] {
  return [...ALL_PERMISSIONS];
}
