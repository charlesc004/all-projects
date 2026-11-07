import { Module } from '@nestjs/common';
import {
  CompaniesController,
  ContactsController,
  DealsController,
  LeadsController,
  TasksController,
  WorkflowsController,
} from './crm.controller';
import { CrmService } from './crm.service';

// CRM CRUD is one feature module so tenant scoping, archival and audit rules
// cannot diverge between the five CRM resources.
@Module({
  controllers: [
    LeadsController,
    ContactsController,
    CompaniesController,
    DealsController,
    TasksController,
    WorkflowsController,
  ],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
