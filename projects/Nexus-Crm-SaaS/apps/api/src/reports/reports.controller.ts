import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthRequest, Roles } from '../common/security';
import { ReportsService } from './reports.service';
import { ApiDateRange } from '../common/openapi';

@ApiTags('Dashboard and reports')
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get('dashboard/summary')
  @ApiDateRange()
  @ApiOperation({
    summary: 'Live CRM totals; period-filtered closed revenue and created-lead conversion rate.',
  })
  dashboard(@Query() query: unknown, @Req() request: AuthRequest) {
    return this.reports.dashboard(request.user, query);
  }
  @Roles('ADMIN', 'MANAGER')
  @Get('reports/sales')
  @ApiDateRange()
  sales(@Query() query: unknown, @Req() request: AuthRequest) {
    return this.reports.sales(request.user, query);
  }
  @Roles('ADMIN', 'MANAGER')
  @Get('reports/export')
  @ApiDateRange()
  async export(@Query() query: unknown, @Req() request: AuthRequest, @Res() response: Response) {
    const csv = await this.reports.export(request.user, query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="nexus-sales-report.csv"');
    response.send(csv);
  }
}
