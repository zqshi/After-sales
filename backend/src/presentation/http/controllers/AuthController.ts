import { FastifyReply, FastifyRequest } from 'fastify';

import { LoginUseCase } from '../../../application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from '../../../application/use-cases/auth/RegisterUseCase';
import { GetCurrentUserUseCase } from '../../../application/use-cases/auth/GetCurrentUserUseCase';
import { LoginRequestDTO } from '../../../application/dto/auth/LoginRequestDTO';
import { RegisterRequestDTO } from '../../../application/dto/auth/RegisterRequestDTO';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const payload = request.body as LoginRequestDTO;
      const user = await this.loginUseCase.execute(payload);

      const token = await reply.jwtSign({
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      reply.code(200).send({
        success: true,
        data: {
          token,
          user,
        },
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const payload = request.body as RegisterRequestDTO;
      const user = await this.registerUseCase.execute(payload);

      reply.code(201).send({
        success: true,
        data: user,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request.user as { sub?: string }).sub;
      if (!userId) {
        reply.code(401).send({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await this.getCurrentUserUseCase.execute(userId);
      reply.code(200).send({ success: true, data: user });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404
      : message.includes('invalid credentials') ? 401
        : message.includes('disabled') ? 403
          : message.includes('exists') ? 409
            : 400;

    reply.code(status).send({
      success: false,
      error: message,
    });
  }
}
