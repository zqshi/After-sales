export interface MemberAuth {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  passwordAlgo: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  auth?: MemberAuth;
}
