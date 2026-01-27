import { FastifyReply, FastifyRequest } from 'fastify';

import { CreateMemberRequestDTO, UpdateMemberRequestDTO } from '../../../application/dto/permissions/MemberRequestDTO';
import { CreateRoleRequestDTO, UpdateRoleRequestDTO } from '../../../application/dto/permissions/RoleRequestDTO';
import { CreateMemberUseCase } from '../../../application/use-cases/permissions/CreateMemberUseCase';
import { CreateRoleUseCase } from '../../../application/use-cases/permissions/CreateRoleUseCase';
import { DeleteMemberUseCase } from '../../../application/use-cases/permissions/DeleteMemberUseCase';
import { DeleteRoleUseCase } from '../../../application/use-cases/permissions/DeleteRoleUseCase';
import { ListMembersUseCase } from '../../../application/use-cases/permissions/ListMembersUseCase';
import { ListRolesUseCase } from '../../../application/use-cases/permissions/ListRolesUseCase';
import { UpdateMemberUseCase } from '../../../application/use-cases/permissions/UpdateMemberUseCase';
import { UpdateRoleUseCase } from '../../../application/use-cases/permissions/UpdateRoleUseCase';

export class PermissionController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly listMembersUseCase: ListMembersUseCase,
    private readonly createMemberUseCase: CreateMemberUseCase,
    private readonly updateMemberUseCase: UpdateMemberUseCase,
    private readonly deleteMemberUseCase: DeleteMemberUseCase,
  ) {}

  async listRoles(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const roles = await this.listRolesUseCase.execute();
      reply.code(200).send({ success: true, data: roles });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async createRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const payload = request.body as CreateRoleRequestDTO;
      const role = await this.createRoleUseCase.execute(payload);
      await request.server.rolePermissionService?.refresh();
      reply.code(201).send({ success: true, data: role });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async updateRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const roleKey = (request.params as { id: string }).id;
      const payload = request.body as UpdateRoleRequestDTO;
      const role = await this.updateRoleUseCase.execute(roleKey, payload);
      await request.server.rolePermissionService?.refresh();
      reply.code(200).send({ success: true, data: role });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async deleteRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const roleKey = (request.params as { id: string }).id;
      await this.deleteRoleUseCase.execute(roleKey);
      await request.server.rolePermissionService?.refresh();
      reply.code(200).send({ success: true });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async listMembers(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const members = await this.listMembersUseCase.execute();
      reply.code(200).send({ success: true, data: members });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async createMember(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const payload = request.body as CreateMemberRequestDTO;
      const member = await this.createMemberUseCase.execute(payload);
      reply.code(201).send({ success: true, data: member });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async updateMember(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const memberId = (request.params as { id: string }).id;
      const payload = request.body as UpdateMemberRequestDTO;
      const member = await this.updateMemberUseCase.execute(memberId, payload);
      reply.code(200).send({ success: true, data: member });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async deleteMember(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const memberId = (request.params as { id: string }).id;
      const currentUserId = (request.user as { sub?: string })?.sub;
      if (currentUserId && currentUserId === memberId) {
        reply.code(400).send({ success: false, error: 'cannot delete current user' });
        return;
      }
      await this.deleteMemberUseCase.execute(memberId);
      reply.code(200).send({ success: true });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404
      : message.includes('exists') || message.includes('assigned') ? 409
        : message.includes('cannot delete') ? 400
          : message.includes('invalid') || message.includes('required') ? 400
            : 500;

    reply.code(status).send({
      success: false,
      error: message,
    });
  }
}
