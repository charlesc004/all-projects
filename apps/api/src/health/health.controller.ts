import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/security';
import { PrismaService } from '../database/prisma.service';
import { RateLimitService } from '../redis/rate-limit.service';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly db: PrismaService,
    private readonly rate: RateLimitService,
  ) {}
  @Get() async check() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', redis: this.rate.health() };
    } catch {
      throw new ServiceUnavailableException('Database unavailable.');
    }
  }
}
