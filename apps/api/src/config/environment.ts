import { z } from 'zod';

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  REDIS_URL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().url().optional(),
  ),
});
export type Environment = z.infer<typeof environment>;
const knownPlaceholderSecrets = new Set([
  'replace-with-at-least-32-random-characters',
  'integration-tests-only-signing-secret-at-least-32-characters',
]);
export function validateEnvironment(input: NodeJS.ProcessEnv): Environment {
  const config = environment.parse(input);
  if (config.NODE_ENV === 'production') {
    if (!config.WEB_ORIGIN.startsWith('https://'))
      throw new Error('WEB_ORIGIN must use HTTPS in production.');
    if (
      knownPlaceholderSecrets.has(config.JWT_ACCESS_SECRET.toLowerCase()) ||
      /demo|change|development|example|placeholder/i.test(config.JWT_ACCESS_SECRET)
    )
      throw new Error('Set a strong production JWT_ACCESS_SECRET.');
  }
  return config;
}
