import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email?: string | null;
      role?: string;
      name?: string;
    };
    user: {
      sub: string;
      email?: string | null;
      role?: string;
      name?: string;
    };
  }
}
