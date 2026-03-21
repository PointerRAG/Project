import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";
import { signupSchema, loginSchema } from "@/lib/validation/auth";

export const auth = betterAuth({
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.20.8:3000",
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [nextCookies()],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const parsed = signupSchema.safeParse(ctx.body);
        if (!parsed.success) {
          throw new APIError("BAD_REQUEST", {
            message: parsed.error.issues[0].message,
          });
        }
        ctx.body = parsed.data;
      }
      if (ctx.path === "/sign-in/email") {
        const parsed = loginSchema.safeParse(ctx.body);
        if (!parsed.success) {
          throw new APIError("BAD_REQUEST", {
            message: parsed.error.issues[0].message,
          });
        }
        ctx.body = parsed.data;
      }
    }),
  },
});
