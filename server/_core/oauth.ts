import { randomUUID } from "node:crypto";
import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getRedirectUri(req: Request) {
  return ENV.googleRedirectUri || `${req.protocol}://${req.get("host")}/api/oauth/callback`;
}

function encodeState(value: { redirectUri: string; nonce: string }) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function isGoogleConfigured() {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret);
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/google/start", (req: Request, res: Response) => {
    if (!isGoogleConfigured()) {
      res.status(500).json({ error: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
      return;
    }
    const redirectUri = getRedirectUri(req);
    const nonce = randomUUID();
    const state = encodeState({ redirectUri, nonce });
    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      ...getSessionCookieOptions(req),
      maxAge: 10 * 60 * 1000,
      httpOnly: true,
    });
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get(["/api/oauth/google/callback", "/api/oauth/callback"], async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const oauthError = getQueryParam(req, "error");

    if (oauthError) {
      res.status(400).send(`Google sign-in was cancelled: ${oauthError}`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "Google code and state are required" });
      return;
    }

    const { nonce, redirectUri } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce || redirectUri !== getRedirectUri(req)) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { ...getSessionCookieOptions(req), httpOnly: true });

    try {
      if (!isGoogleConfigured()) throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing");
      if (!ENV.cookieSecret) throw new Error("JWT_SECRET is missing");
      if (!ENV.mongodbUri) throw new Error("MONGODB_URI is missing");
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error?: string; error_description?: string };
      if (!tokenResponse.ok) {
        throw new Error(`Google token exchange failed: ${tokenPayload.error_description || tokenPayload.error || `HTTP ${tokenResponse.status}`}`);
      }
      const tokens = tokenPayload;
      if (!tokens.access_token) throw new Error("Google did not return an access token");

      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileResponse.ok) throw new Error(`Google profile request failed (HTTP ${profileResponse.status})`);
      const profile = (await profileResponse.json()) as { sub?: string; email?: string; name?: string };
      if (!profile.sub || !profile.email) throw new Error("Google profile is missing a user id or email");
      const openId = `google:${profile.sub}`;

      await db.upsertUser({
        openId,
        name: profile.name || profile.email,
        email: profile.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: profile.name || profile.email,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      const message = error instanceof Error ? error.message : "Unknown OAuth error";
      res.status(500).send(`Google sign-in failed: ${message}. Check Render environment variables and Google redirect URI.`);
    }
  });
}
