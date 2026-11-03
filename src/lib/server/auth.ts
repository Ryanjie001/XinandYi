import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { database } from "@/lib/server/database";
export const appOrigin = new URL(process.env.APP_URL || "http://127.0.0.1:3000").origin;
export const auth = betterAuth({
  appName: "新&怡",
  baseURL: appOrigin,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(database(), { provider: "mysql", transaction: true }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      person: { type: "string", required: true, input: false, defaultValue: "新" },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  trustedOrigins: [appOrigin],
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/change-password": { window: 60, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: appOrigin.startsWith("https:"),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => (["xin", "yi"].includes(session.userId) ? undefined : false),
      },
    },
  },
});
