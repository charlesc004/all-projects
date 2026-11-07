import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = randomUUID();
    let statusCode = 500;
    let message: string | string[] = 'An unexpected error occurred. Please try again.';
    if (error instanceof SyntaxError && 'body' in error) {
      statusCode = 400;
      message = 'Request body must contain valid JSON.';
    } else if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      statusCode = 413;
      message = 'Request body exceeds the allowed size.';
    } else if (error instanceof ZodError) {
      statusCode = 400;
      message = error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`);
    } else if (error instanceof HttpException) {
      statusCode = error.getStatus();
      const body = error.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? error.message);
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' || error.code === 'P2034') {
        statusCode = 409;
        message = 'This change conflicts with an existing record. Please refresh and try again.';
      }
      if (error.code === 'P2025') {
        statusCode = 404;
        message = 'Record not found.';
      }
      if (error.code === 'P2003') {
        statusCode = 400;
        message = 'A related record is unavailable.';
      }
    }
    if (statusCode >= 500)
      this.logger.error(
        `Request ${requestId} failed`,
        error instanceof Error ? error.stack : undefined,
      );
    response.status(statusCode).json({ statusCode, message, requestId });
  }
}

export function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const result = Object.fromEntries(
      Object.entries(object).map(([key, val]) => [key, serialize(val)]),
    );
    if ('type' in object && 'title' in object && 'actorId' in object) {
      result.action = object.type;
      result.description = object.description || object.title;
    }
    if ('body' in object && 'userId' in object) {
      result.message = object.body;
      result.link = object.href;
    }
    return result;
  }
  return value;
}
