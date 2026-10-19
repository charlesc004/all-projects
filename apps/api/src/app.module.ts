import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { AuthGuard } from './common/security';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { NotesModule } from './notes/notes.module';
import { NotificationsController } from './notifications/notifications.controller';
import { RedisModule } from './redis/redis.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './users/settings.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuthModule,
    CrmModule,
    NotesModule,
    ReportsModule,
    SettingsModule,
  ],
  controllers: [HealthController, NotificationsController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
