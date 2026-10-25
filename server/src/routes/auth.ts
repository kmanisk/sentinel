import { randomBytes } from "node:crypto";
import { FastifyInstance, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth";

type OAuthProvider = "google" | "github";

interface OAuthProfile {
  email: string;
  name?: string;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const providerSchema = z.enum(["google", "github"]);

const appUrl = env.APP_URL.replace(/\/+$/, "");

const providerEnabled = (provider: OAuthProvider): boolean => {
  if (provider === "google") {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
};

const callbackUrl = (provider: OAuthProvider): string =>
  `${appUrl}/api/auth/oauth/${provider}/callback`;

const oauthFailure = (reply: FastifyReply, message: string) =>
  reply.redirect(`${appUrl}/#auth_error=${encodeURIComponent(message)}`);

async function getGoogleProfile(code: string): Promise<OAuthProfile> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl("google"),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Google token exchange failed");
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error("Google did not return an access token");
  }

  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error("Google profile lookup failed");
  }

  const profile = (await userResponse.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!profile.email || profile.email_verified === false) {
    throw new Error("Google account does not expose a verified email");
  }

  return { email: profile.email.toLowerCase(), name: profile.name };
}

async function getGitHubProfile(code: string): Promise<OAuthProfile> {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.GITHUB_CLIENT_ID!,
      client_secret: env.GITHUB_CLIENT_SECRET!,
      redirect_uri: callbackUrl("github"),
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("GitHub token exchange failed");
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error("GitHub did not return an access token");
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${tokenData.access_token}`,
    "User-Agent": "Sentinel",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const userResponse = await fetch("https://api.github.com/user", { headers });
  if (!userResponse.ok) {
    throw new Error("GitHub profile lookup failed");
  }

  const profile = (await userResponse.json()) as {
    login?: string;
    name?: string;
    email?: string | null;
  };

  let email = profile.email || undefined;

  if (!email) {
    const emailResponse = await fetch("https://api.github.com/user/emails", { headers });
    if (!emailResponse.ok) {
      throw new Error("GitHub email lookup failed");
    }

    const emails = (await emailResponse.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    email =
      emails.find((item) => item.primary && item.verified)?.email ||
      emails.find((item) => item.verified)?.email;
  }

  if (!email) {
    throw new Error("GitHub account does not expose a verified email");
  }

  return {
    email: email.toLowerCase(),
    name: profile.name || profile.login,
  };
}

async function findOrCreateOAuthUser(profile: OAuthProfile) {
  const existing = await prisma.user.findUnique({ where: { email: profile.email } });

  if (existing) {
    if (!existing.name && profile.name) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { name: profile.name },
      });
    }
    return existing;
  }

  const placeholderPassword = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      password: placeholderPassword,
    },
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get("/providers", async () => ({
    providers: {
      google: providerEnabled("google"),
      github: providerEnabled("github"),
    },
  }));

  app.get<{ Params: { provider: string } }>("/oauth/:provider", async (request, reply) => {
    const parsedProvider = providerSchema.safeParse(request.params.provider);
    if (!parsedProvider.success) {
      return reply.status(404).send({ error: "Unknown OAuth provider" });
    }

    const provider = parsedProvider.data;
    if (!providerEnabled(provider)) {
      return reply.status(503).send({ error: `${provider} OAuth is not configured` });
    }

    const state = app.jwt.sign(
      { purpose: "oauth", provider },
      { expiresIn: "10m" }
    );

    if (provider === "google") {
      const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorizeUrl.search = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        redirect_uri: callbackUrl("google"),
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
      }).toString();
      return reply.redirect(authorizeUrl.toString());
    }

    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.search = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID!,
      redirect_uri: callbackUrl("github"),
      scope: "read:user user:email",
      state,
    }).toString();

    return reply.redirect(authorizeUrl.toString());
  });

  app.get<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string; error?: string; error_description?: string };
  }>("/oauth/:provider/callback", async (request, reply) => {
    const parsedProvider = providerSchema.safeParse(request.params.provider);
    if (!parsedProvider.success) {
      return oauthFailure(reply, "Unknown OAuth provider");
    }

    const provider = parsedProvider.data;

    if (request.query.error) {
      return oauthFailure(reply, request.query.error_description || request.query.error);
    }

    if (!request.query.code || !request.query.state) {
      return oauthFailure(reply, "OAuth callback is missing required parameters");
    }

    try {
      const state = app.jwt.verify<{ purpose: string; provider: OAuthProvider }>(request.query.state);
      if (state.purpose !== "oauth" || state.provider !== provider) {
        throw new Error("OAuth state mismatch");
      }

      const profile =
        provider === "google"
          ? await getGoogleProfile(request.query.code)
          : await getGitHubProfile(request.query.code);

      const user = await findOrCreateOAuthUser(profile);
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

      return reply.redirect(`${appUrl}/#auth_token=${encodeURIComponent(token)}`);
    } catch (error) {
      request.log.warn({ err: error, provider }, "OAuth sign-in failed");
      return oauthFailure(reply, "OAuth sign-in failed");
    }
  });

  app.post("/register", async (request, reply) => {
    const parse = registerSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Validation failed", details: parse.error.format() });
    }

    const { email, password, name } = parse.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return reply.status(409).send({ error: "A user with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name || normalizedEmail.split("@")[0],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return reply.status(201).send({ user, token });
  });

  app.post("/login", async (request, reply) => {
    const parse = loginSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: "Validation failed", details: parse.error.format() });
    }

    const { email, password } = parse.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  });

  app.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    return reply.send({ user });
  });
}
