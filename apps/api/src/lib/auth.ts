import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Env } from "../env";
import type { Database } from "../db/client";
import * as schema from "../db/schema";

export function createAuth(env: Env, db: Database) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.APP_URL],
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // Dev: log link. Production: wire Resend later.
          console.log(`[magic-link] ${email}: ${url}`);
        },
      }),
    ],
    advanced: {
      crossSubDomainCookies: {
        enabled: env.COOKIE_DOMAIN !== "localhost",
        domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
      },
      defaultCookieAttributes: {
        sameSite: env.COOKIE_DOMAIN === "localhost" ? "lax" : "none",
        secure: env.COOKIE_DOMAIN !== "localhost",
        path: "/",
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
