import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { CrmService } from '../crm/crm.service';
import { activityScope, assertCanMutate, AuthRequest, publicUserSelect } from '../common/security';
import { entityQuerySchema, noteSchema } from '../common/validation';
import { ApiZodBody } from '../common/openapi';

@ApiTags('Notes and activity')
@Controller()
export class NotesController {
  constructor(
    private readonly db: PrismaService,
    private readonly crm: CrmService,
  ) {}
  @Get('notes')
  @ApiQuery({ name: 'entityType', enum: ['lead', 'contact', 'company', 'deal'] })
  @ApiQuery({ name: 'entityId', type: String })
  async notes(@Query() query: unknown, @Req() request: AuthRequest) {
    const args = entityQuerySchema.parse(query);
    await this.crm.get(args.entityType, args.entityId, request.user);
    return this.db.note.findMany({
      where: {
        organizationId: request.user.organizationId,
        [`${args.entityType}Id`]: args.entityId,
      },
      include: { author: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  @Get('activities')
  @ApiQuery({ name: 'entityType', enum: ['lead', 'contact', 'company', 'deal'] })
  @ApiQuery({ name: 'entityId', type: String })
  async activities(@Query() query: unknown, @Req() request: AuthRequest) {
    const args = entityQuerySchema.parse(query);
    await this.crm.get(args.entityType, args.entityId, request.user);
    return this.db.activity.findMany({
      where: {
        ...activityScope(request.user),
        [`${args.entityType}Id`]: args.entityId,
      },
      include: { actor: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  @Post('notes')
  @ApiZodBody(noteSchema)
  async create(@Body() input: unknown, @Req() request: AuthRequest) {
    const data = noteSchema.parse(input);
    const kinds = (['lead', 'contact', 'company', 'deal'] as const).filter(
      (kind) => data[`${kind}Id`],
    );
    if (kinds.length !== 1)
      throw new BadRequestException('Link the note to exactly one CRM record.');
    const kind = kinds[0];
    return this.db.$transaction(async (tx) => {
      const related = await this.crm.record(tx, kind, data[`${kind}Id`]!, request.user);
      assertCanMutate(request.user, related);
      const note = await tx.note.create({
        data: { ...data, authorId: request.user.id, organizationId: request.user.organizationId },
        include: { author: { select: publicUserSelect } },
      });
      await this.crm.activity(
        tx,
        request.user,
        kind,
        related,
        'NOTE_ADDED',
        `Added a note to ${kind}`,
      );
      return note;
    });
  }
  @Delete('notes/:id') async remove(@Param('id') id: string, @Req() request: AuthRequest) {
    const note = await this.db.note.findFirst({
      where: { id, organizationId: request.user.organizationId },
    });
    if (!note) throw new NotFoundException('Note not found.');
    const kind = (['lead', 'contact', 'company', 'deal', 'task'] as const).find(
      (entry) => note[`${entry}Id`],
    );
    if (kind) await this.crm.record(this.db, kind, note[`${kind}Id`]!, request.user);
    assertCanMutate(request.user, { ownerId: note.authorId });
    await this.db.note.delete({ where: { id, organizationId: request.user.organizationId } });
    return { message: 'Note deleted.' };
  }
}
