import { entitySchemas, listSchema, dateRange } from './validation';
import { validateEnvironment } from '../config/environment';

describe('boundary validation', () => {
  it('rejects client-provided roles, invalid enums, oversized pages, and negative deal values', () => {
    expect(() =>
      entitySchemas.lead.parse({ firstName: 'A', lastName: 'B', role: 'ADMIN' }),
    ).toThrow();
    expect(() =>
      entitySchemas.lead.parse({ firstName: 'A', lastName: 'B', status: 'BOGUS' }),
    ).toThrow();
    expect(() => listSchema.parse({ pageSize: 101 })).toThrow();
    expect(() => entitySchemas.deal.parse({ title: 'Opportunity', value: -1 })).toThrow();
  });
  it('accepts ISO and calendar dates but rejects impossible dates', () => {
    expect(
      entitySchemas.task.parse({ title: 'Follow up', dueDate: '2026-10-18' }).dueDate,
    ).toBeInstanceOf(Date);
    expect(() => entitySchemas.task.parse({ title: 'Follow up', dueDate: 'invalid' })).toThrow();
    expect(() => entitySchemas.task.parse({ title: 'Follow up', dueDate: '2026-02-31' })).toThrow();
    expect(() => dateRange({ from: '2026-02-31' })).toThrow();
    expect(() => dateRange({ from: '2026-12-01', to: '2026-01-01' })).toThrow();
  });
  it('allows empty optional Redis config and fails insecure production configuration', () => {
    const env = {
      DATABASE_URL: 'postgresql://nexus:password@localhost:5432/nexus',
      JWT_ACCESS_SECRET: 'a'.repeat(64),
      REDIS_URL: '',
    };
    expect(validateEnvironment(env).REDIS_URL).toBeUndefined();
    expect(() =>
      validateEnvironment({ ...env, NODE_ENV: 'production', WEB_ORIGIN: 'http://localhost:3000' }),
    ).toThrow('HTTPS');
    expect(() => validateEnvironment({ ...env, JWT_ACCESS_SECRET: 'short' })).toThrow();
  });
  it('rejects the checked-in example and integration signing secrets in production', () => {
    const production = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://nexus:password@localhost:5432/nexus',
      WEB_ORIGIN: 'https://crm.example.test',
    };
    for (const placeholder of [
      'replace-with-at-least-32-random-characters',
      'integration-tests-only-signing-secret-at-least-32-characters',
    ]) {
      expect(() => validateEnvironment({ ...production, JWT_ACCESS_SECRET: placeholder })).toThrow(
        'Set a strong production JWT_ACCESS_SECRET.',
      );
    }
    expect(() =>
      validateEnvironment({
        ...production,
        JWT_ACCESS_SECRET: '6fca5bf1b8634a02ad79b8e47105c9361fe43290bb7dc8562a14fb339e805d7a',
      }),
    ).not.toThrow();
  });
});
