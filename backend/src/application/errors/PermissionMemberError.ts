export enum PermissionMemberErrorCode {
  NAME_REQUIRED = 'PERM_MEMBER_NAME_REQUIRED',
  NAME_INVALID = 'PERM_MEMBER_NAME_INVALID',
  NAME_ILLEGAL = 'PERM_MEMBER_NAME_ILLEGAL',
  EMAIL_REQUIRED = 'PERM_MEMBER_EMAIL_REQUIRED',
  EMAIL_INVALID = 'PERM_MEMBER_EMAIL_INVALID',
  EMAIL_DOMAIN_MISMATCH = 'PERM_MEMBER_EMAIL_DOMAIN_MISMATCH',
  EMAIL_DUPLICATE = 'PERM_MEMBER_EMAIL_DUPLICATE',
  ROLE_REQUIRED = 'PERM_MEMBER_ROLE_REQUIRED',
  ROLE_NOT_FOUND = 'PERM_MEMBER_ROLE_NOT_FOUND',
  REMARK_INVALID = 'PERM_MEMBER_REMARK_INVALID',
  STATUS_INVALID = 'PERM_MEMBER_STATUS_INVALID',
  SELF_DELETE_FORBIDDEN = 'PERM_MEMBER_SELF_DELETE_FORBIDDEN',
  FORBIDDEN = 'PERM_MEMBER_FORBIDDEN',
  SSO_LOOKUP_FAILED = 'PERM_MEMBER_SSO_LOOKUP_FAILED',
  SSO_NOT_FOUND = 'PERM_MEMBER_SSO_NOT_FOUND',
  MEMBER_NOT_FOUND = 'PERM_MEMBER_NOT_FOUND',
}

export class PermissionMemberError extends Error {
  constructor(
    public readonly code: PermissionMemberErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PermissionMemberError';
  }
}

export function mapPermissionMemberErrorStatus(code: PermissionMemberErrorCode): number {
  switch (code) {
    case PermissionMemberErrorCode.EMAIL_DUPLICATE:
      return 409;
    case PermissionMemberErrorCode.FORBIDDEN:
      return 403;
    case PermissionMemberErrorCode.SELF_DELETE_FORBIDDEN:
      return 403;
    case PermissionMemberErrorCode.MEMBER_NOT_FOUND:
      return 404;
    default:
      return 400;
  }
}
