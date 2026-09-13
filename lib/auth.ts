import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const isProduction = process.env.NODE_ENV === 'production';
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

if (isProduction && !isBuild && !process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET must be configured in production.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const auth = betterAuth({
  appName: 'SmartCart',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret:
    process.env.BETTER_AUTH_SECRET ||
    (isBuild
      ? 'smartcart-build-only-secret-not-used-at-runtime-32chars'
      : 'smartcart-development-only-secret-change-me-32chars'),
  ...(isBuild ? {} : { database: pool }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  ...(googleConfigured
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          },
        },
      }
    : {}),
});

export const isGoogleConfigured = googleConfigured;
