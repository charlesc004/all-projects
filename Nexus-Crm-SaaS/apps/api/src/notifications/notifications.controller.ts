import { Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthRequest } from '../common/security';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly db: PrismaService) {}
  @Get()
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false, description: 'Maximum 100.' })
  @ApiQuery({ name: 'unread', enum: ['true', 'false'], required: false })
  async list(@Query() query: unknown, @Req() request: AuthRequest) {
    const args = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
        unread: z.enum(['true', 'false']).optional(),
      })
      .strict()
      .parse(query);
    const due = await this.db.task.findMany({
      where: {
        organizationId: request.user.organizationId,
        assigneeId: request.user.id,
        status: { not: 'COMPLETED' },
        dueDate: { gte: new Date(), lte: new Date(Date.now() + 86400000) },
      },
      take: 50,
    });
    for (const task of due)
      await this.db.notification.upsert({
        where: { dedupeKey: `due:${task.id}:${task.dueDate?.toISOString()}` },
        create: {
          dedupeKey: `due:${task.id}:${task.dueDate?.toISOString()}`,
          organizationId: request.user.organizationId,
          userId: request.user.id,
          title: 'Task due soon',
          body: task.title,
          href: '/tasks',
        },
        update: {},
      });
    const where = {
      organizationId: request.user.organizationId,
      userId: request.user.id,
      ...(args.unread === 'true' ? { readAt: null } : {}),
    };
    const [data, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (args.page - 1) * args.pageSize,
        take: args.pageSize,
      }),
      this.db.notification.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: args.page,
        pageSize: args.pageSize,
        total,
        totalPages: Math.ceil(total / args.pageSize),
      },
    };
  }
  @Patch(':id/read') async read(@Param('id') id: string, @Req() request: AuthRequest) {
    const updated = await this.db.notification.updateMany({
      where: { id, userId: request.user.id, organizationId: request.user.organizationId },
      data: { readAt: new Date() },
    });
    if (!updated.count) throw new NotFoundException('Notification not found.');
    return { message: 'Notification marked as read.' };
  }
  @Post('read-all') async readAll(@Req() request: AuthRequest) {
    await this.db.notification.updateMany({
      where: { userId: request.user.id, organizationId: request.user.organizationId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: 'All notifications marked as read.' };
  }
}
