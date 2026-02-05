import { FastifyReply, FastifyRequest } from 'fastify';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.method === 'OPTIONS') {
    return;
  }
  const config = request.routeOptions.config as { auth?: boolean } | undefined;
  if (config && config.auth === false) {
    return;
  }

  try {
    await request.jwtVerify();
  } catch (_error) {
    void reply.code(401).send({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }
}
