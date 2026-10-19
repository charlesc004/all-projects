-- Active records are unique within their tenant, including case variants.
CREATE UNIQUE INDEX "Contact_active_email_key" ON "Contact" ("organizationId", lower(btrim("email"))) WHERE "archivedAt" IS NULL AND "email" IS NOT NULL;
CREATE UNIQUE INDEX "Company_active_name_key" ON "Company" ("organizationId", lower(btrim("name"))) WHERE "archivedAt" IS NULL;

-- Business state must remain valid even if an administrative script bypasses the API.
ALTER TABLE "Task" ADD CONSTRAINT "Task_one_related_record" CHECK (num_nonnulls("leadId", "contactId", "companyId", "dealId") <= 1);
ALTER TABLE "Note" ADD CONSTRAINT "Note_one_related_record" CHECK (num_nonnulls("leadId", "contactId", "companyId", "dealId", "taskId") = 1);
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_nonnegative_value" CHECK ("value" >= 0);
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_closed_timestamp" CHECK (("stage" IN ('WON', 'LOST')) = ("closedAt" IS NOT NULL));
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_lost_reason" CHECK ("stage" <> 'LOST' OR length(btrim(coalesce("lostReason", ''))) > 0);
ALTER TABLE "Task" ADD CONSTRAINT "Task_completed_timestamp" CHECK (("status" = 'COMPLETED') = ("completedAt" IS NOT NULL));
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_converted_timestamp" CHECK (("status" = 'CONVERTED') = ("convertedAt" IS NOT NULL));

-- Composite tenant foreign keys supplement normal Prisma relations. Deferred
-- checks allow the normal optional relation ON DELETE SET NULL actions to run.
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_tenant_fkey" FOREIGN KEY ("ownerId", "organizationId") REFERENCES "User" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_tenant_fkey" FOREIGN KEY ("ownerId", "organizationId") REFERENCES "User" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_tenant_fkey" FOREIGN KEY ("ownerId", "organizationId") REFERENCES "User" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_tenant_fkey" FOREIGN KEY ("ownerId", "organizationId") REFERENCES "User" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_tenant_fkey" FOREIGN KEY ("assigneeId", "organizationId") REFERENCES "User" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_tenant_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_tenant_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_tenant_fkey" FOREIGN KEY ("contactId", "organizationId") REFERENCES "Contact" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedContactId_tenant_fkey" FOREIGN KEY ("convertedContactId", "organizationId") REFERENCES "Contact" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedCompanyId_tenant_fkey" FOREIGN KEY ("convertedCompanyId", "organizationId") REFERENCES "Company" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedDealId_tenant_fkey" FOREIGN KEY ("convertedDealId", "organizationId") REFERENCES "Deal" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_tenant_fkey" FOREIGN KEY ("leadId", "organizationId") REFERENCES "Lead" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Task" ADD CONSTRAINT "Task_contactId_tenant_fkey" FOREIGN KEY ("contactId", "organizationId") REFERENCES "Contact" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_tenant_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Task" ADD CONSTRAINT "Task_dealId_tenant_fkey" FOREIGN KEY ("dealId", "organizationId") REFERENCES "Deal" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_tenant_fkey" FOREIGN KEY ("authorId", "organizationId") REFERENCES "User" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_tenant_fkey" FOREIGN KEY ("leadId", "organizationId") REFERENCES "Lead" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Note" ADD CONSTRAINT "Note_contactId_tenant_fkey" FOREIGN KEY ("contactId", "organizationId") REFERENCES "Contact" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_tenant_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Note" ADD CONSTRAINT "Note_dealId_tenant_fkey" FOREIGN KEY ("dealId", "organizationId") REFERENCES "Deal" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Note" ADD CONSTRAINT "Note_taskId_tenant_fkey" FOREIGN KEY ("taskId", "organizationId") REFERENCES "Task" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_tenant_fkey" FOREIGN KEY ("actorId", "organizationId") REFERENCES "User" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_tenant_fkey" FOREIGN KEY ("leadId", "organizationId") REFERENCES "Lead" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_tenant_fkey" FOREIGN KEY ("contactId", "organizationId") REFERENCES "Contact" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_tenant_fkey" FOREIGN KEY ("companyId", "organizationId") REFERENCES "Company" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_tenant_fkey" FOREIGN KEY ("dealId", "organizationId") REFERENCES "Deal" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_taskId_tenant_fkey" FOREIGN KEY ("taskId", "organizationId") REFERENCES "Task" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_tenant_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User" ("id", "organizationId") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;

