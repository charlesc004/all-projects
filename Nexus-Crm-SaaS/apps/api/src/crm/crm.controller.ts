import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../common/security';
import { CrmService } from './crm.service';
import { EntityKind } from '../common/validation';
import { entitySchemas } from '../common/validation';
import { ApiListQuery, ApiZodBody } from '../common/openapi';

function resourceController(kind: EntityKind, path: string, example: Record<string, unknown>) {
  @ApiTags(path)
  @Controller(path)
  class ResourceController {
    constructor(readonly service: CrmService) {}
    @Get()
    @ApiListQuery(kind)
    @ApiOperation({
      summary: `List ${path} with tenant-scoped pagination, search, sort and filters.`,
    })
    list(@Query() query: Record<string, unknown>, @Req() request: AuthRequest) {
      return this.service.list(kind, query, request.user);
    }
    @Get(':id') get(@Param('id') id: string, @Req() request: AuthRequest) {
      return this.service.get(kind, id, request.user);
    }
    @Post()
    @ApiZodBody(entitySchemas[kind], example)
    create(@Body() input: unknown, @Req() request: AuthRequest) {
      return this.service.create(kind, input, request.user);
    }
    @Patch(':id')
    @ApiZodBody(entitySchemas[kind].partial())
    update(@Param('id') id: string, @Body() input: unknown, @Req() request: AuthRequest) {
      return this.service.update(kind, id, input, request.user);
    }
    @Delete(':id') delete(@Param('id') id: string, @Req() request: AuthRequest) {
      return this.service.remove(kind, id, request.user);
    }
  }
  Object.defineProperty(ResourceController, 'name', { value: `${path}Controller` });
  return ResourceController;
}
export const LeadsController = resourceController('lead', 'leads', {
  firstName: 'Avery',
  lastName: 'Lane',
  email: 'avery@example.test',
  companyName: 'Orbit Studio',
  source: 'WEBSITE',
  priority: 'MEDIUM',
});
export const ContactsController = resourceController('contact', 'contacts', {
  firstName: 'Avery',
  lastName: 'Lane',
  email: 'avery@example.test',
  jobTitle: 'Director',
});
export const CompaniesController = resourceController('company', 'companies', {
  name: 'Orbit Studio',
  industry: 'Design',
  website: 'https://example.test',
});
export const DealsController = resourceController('deal', 'deals', {
  title: 'Orbit annual workspace',
  value: 12000,
  stage: 'QUALIFICATION',
  expectedCloseDate: '2026-12-31',
});
export const TasksController = resourceController('task', 'tasks', {
  title: 'Prepare account proposal',
  priority: 'MEDIUM',
  status: 'TODO',
  dueDate: '2026-12-01',
});

@ApiTags('leads', 'deals')
@Controller()
export class WorkflowsController {
  constructor(private readonly crm: CrmService) {}
  @Post('leads/:id/convert')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        createDeal: { type: 'boolean' },
        dealTitle: { type: 'string' },
        dealValue: { type: 'number', minimum: 0 },
      },
    },
  })
  convert(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.crm.convert(id, body, request.user);
  }
  @Patch('deals/:id/stage')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['stage'],
      properties: {
        stage: {
          type: 'string',
          enum: ['QUALIFICATION', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'],
        },
        lostReason: { type: 'string' },
      },
    },
  })
  stage(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.crm.stage(id, body, request.user);
  }
}
