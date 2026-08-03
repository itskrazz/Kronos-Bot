import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    PUBLIC_BASE_URL: z.string().url().transform((value) => value.replace(/\/$/, '')),
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: booleanFromString,
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().regex(/^\d{16,22}$/),
    DISCORD_CLIENT_SECRET: z.string().min(1),
    DISCORD_GUILD_ID: z.string().regex(/^\d{16,22}$/).optional().or(z.literal('')),
    SESSION_SECRET: z.string().min(32),
    INTERNAL_API_KEY: z.string().min(32).optional().or(z.literal('')),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info')
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && !value.PUBLIC_BASE_URL.startsWith('https://')) {
      context.addIssue({
        code: 'custom',
        path: ['PUBLIC_BASE_URL'],
        message: 'must use HTTPS in production'
      });
    }
  });

export function loadEnv(source = process.env) {
  const result = schema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return {
    ...result.data,
    DISCORD_GUILD_ID: result.data.DISCORD_GUILD_ID || null,
    INTERNAL_API_KEY: result.data.INTERNAL_API_KEY || null
  };
}

