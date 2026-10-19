import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { z } from 'zod';
import { EntityKind, priorities, sources, stages, statuses, taskStatuses } from './validation';

// The application validates with Zod at the boundary. This small adapter keeps
// the same input fields and enum/length constraints visible in the OpenAPI UI.
export function openApiSchema(schema: z.ZodType): SchemaObject {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault)
    return openApiSchema(schema._def.innerType);
  if (schema instanceof z.ZodNullable)
    return { ...openApiSchema(schema._def.innerType), nullable: true };
  if (schema instanceof z.ZodEffects) return openApiSchema(schema.innerType());
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    return {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(shape).map(([key, value]) => [
          key,
          {
            ...openApiSchema(value),
            ...(key.toLowerCase().includes('password') ? { format: 'password' } : {}),
          },
        ]),
      ),
      required: Object.entries(shape)
        .filter(([, value]) => !value.isOptional())
        .map(([key]) => key),
    };
  }
  if (schema instanceof z.ZodEnum) return { type: 'string', enum: schema.options };
  if (schema instanceof z.ZodLiteral)
    return { type: typeof schema.value === 'number' ? 'number' : 'string', enum: [schema.value] };
  if (schema instanceof z.ZodUnion)
    return { anyOf: schema.options.map((option: z.ZodType) => openApiSchema(option)) };
  if (schema instanceof z.ZodNull) return { nullable: true };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodNumber) {
    const result: SchemaObject = { type: 'number' };
    for (const check of schema._def.checks) {
      if (check.kind === 'min') result.minimum = check.value;
      if (check.kind === 'max') result.maximum = check.value;
      if (check.kind === 'int') result.type = 'integer';
    }
    return result;
  }
  if (schema instanceof z.ZodString) {
    const result: SchemaObject = { type: 'string' };
    for (const check of schema._def.checks) {
      if (check.kind === 'min') result.minLength = check.value;
      if (check.kind === 'max') result.maxLength = check.value;
      if (check.kind === 'email') result.format = 'email';
      if (check.kind === 'url') result.format = 'uri';
      if (check.kind === 'datetime') result.format = 'date-time';
      if (check.kind === 'regex') result.pattern = check.regex.source;
    }
    return result;
  }
  return { type: 'string' };
}
export const ApiZodBody = (schema: z.ZodType, example?: Record<string, unknown>) =>
  ApiBody({ schema: { ...openApiSchema(schema), ...(example ? { example } : {}) } });
export const ApiDateRange = () =>
  applyDecorators(
    ApiQuery({
      name: 'from',
      required: false,
      type: String,
      example: '2026-05-01',
      description: 'Inclusive UTC start date (YYYY-MM-DD or ISO timestamp).',
    }),
    ApiQuery({
      name: 'to',
      required: false,
      type: String,
      example: '2026-10-31',
      description: 'Inclusive UTC end date. Defaults to now.',
    }),
  );
export function ApiListQuery(kind: EntityKind) {
  const decorators = [
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      type: Number,
      example: 20,
      description: 'Maximum 100.',
    }),
    ApiQuery({ name: 'search', required: false, type: String }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      type: String,
      example: 'createdAt',
      description: 'An allowlisted field for this resource.',
    }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiQuery({ name: kind === 'task' ? 'assigneeId' : 'ownerId', required: false, type: String }),
  ];
  if (kind === 'lead')
    decorators.push(
      ApiQuery({ name: 'status', required: false, enum: statuses }),
      ApiQuery({ name: 'source', required: false, enum: sources }),
    );
  if (kind === 'task')
    decorators.push(
      ApiQuery({ name: 'status', required: false, enum: taskStatuses }),
      ApiQuery({
        name: 'view',
        required: false,
        enum: ['all', 'upcoming', 'overdue', 'completed'],
      }),
    );
  if (kind === 'lead' || kind === 'task')
    decorators.push(ApiQuery({ name: 'priority', required: false, enum: priorities }));
  if (kind === 'deal')
    decorators.push(ApiQuery({ name: 'stage', required: false, enum: stages }), ApiDateRange());
  if (kind === 'contact' || kind === 'deal')
    decorators.push(ApiQuery({ name: 'companyId', required: false, type: String }));
  return applyDecorators(...decorators);
}
