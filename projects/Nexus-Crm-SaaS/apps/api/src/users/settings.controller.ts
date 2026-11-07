import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { AuthRequest, publicUserSelect, Roles } from '../common/security';
import { PrismaService } from '../database/prisma.service';
import { ApiZodBody } from '../common/openapi';

const inviteSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    role: z.enum(['ADMIN', 'MANAGER', 'SALES_REP']).default('SALES_REP'),
    password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
  })
  .strict();
const memberSchema = z
  .object({
    role: z.enum(['ADMIN', 'MANAGER', 'SALES_REP']).optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => value.role !== undefined || value.active !== undefined,
    'Provide role or active status.',
  );
const organizationSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    website: z
      .union([
        z
          .string()
          .url()
          .max(500)
          .refine((value) => /^https?:\/\//i.test(value)),
        z.literal(''),
        z.null(),
      ])
      .optional(),
    industry: z.string().trim().max(150).nullable().optional(),
    address: z.string().trim().max(1000).nullable().optional(),
    currency: z.literal('USD').optional(),
  })
  .strict();
const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254).optional(),
  })
  .strict();

@ApiTags('Team and settings')
@Controller()
export class SettingsController {
  constructor(private readonly db: PrismaService) {}
  @Get('users') members(@Req() request: AuthRequest) {
    return this.db.user.findMany({
      where: {
        organizationId: request.user.organizationId,
        active: true,
        ...(request.user.role === 'SALES_REP' ? { id: request.user.id } : {}),
      },
      select: publicUserSelect,
      orderBy: { name: 'asc' },
    });
  }
  @Roles('ADMIN')
  @Post('users')
  @ApiZodBody(inviteSchema)
  async invite(@Body() input: unknown, @Req() request: AuthRequest) {
    const body = inviteSchema.parse(input);
    return this.db.user.create({
      data: {
        organizationId: request.user.organizationId,
        name: body.name,
        email: body.email.toLowerCase(),
        role: body.role,
        passwordHash: await hash(body.password, 12),
      },
      select: publicUserSelect,
    });
  }
  @Roles('ADMIN')
  @Patch('users/:id')
  @ApiZodBody(memberSchema)
  async updateMember(@Param('id') id: string, @Body() input: unknown, @Req() request: AuthRequest) {
    const body = memberSchema.parse(input);
    return this.db.$transaction(
      async (tx) => {
        const member = await tx.user.findFirst({
          where: { id, organizationId: request.user.organizationId },
        });
        if (!member) throw new NotFoundException('Team member not found.');
        if (member.id === request.user.id && body.active === false)
          throw new ConflictException('You cannot deactivate your own account.');
        if (
          member.role === 'ADMIN' &&
          ((body.role && body.role !== 'ADMIN') || body.active === false)
        ) {
          const admins = await tx.user.count({
            where: { organizationId: request.user.organizationId, role: 'ADMIN', active: true },
          });
          if (admins <= 1)
            throw new ConflictException('Your workspace must retain an active administrator.');
        }
        const result = await tx.user.update({
          where: { id, organizationId: request.user.organizationId },
          data: body,
          select: publicUserSelect,
        });
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  @Roles('ADMIN', 'MANAGER')
  @Get('settings/organization')
  organization(@Req() request: AuthRequest) {
    return this.db.organization.findUniqueOrThrow({ where: { id: request.user.organizationId } });
  }
  @Roles('ADMIN')
  @Patch('settings/organization')
  @ApiZodBody(organizationSchema)
  updateOrganization(@Body() input: unknown, @Req() request: AuthRequest) {
    const body = organizationSchema.parse(input);
    return this.db.organization.update({ where: { id: request.user.organizationId }, data: body });
  }
  @Patch('settings/profile')
  @ApiZodBody(profileSchema)
  profile(@Body() input: unknown, @Req() request: AuthRequest) {
    const body = profileSchema.parse(input);
    return this.db.user.update({
      where: { id: request.user.id, organizationId: request.user.organizationId },
      data: { ...body, ...(body.email ? { email: body.email.toLowerCase() } : {}) },
      select: publicUserSelect,
    });
  }
}
