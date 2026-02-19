import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "ez_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  role: "admin";
  exp: number;
};

let signingKeyPromise: Promise<CryptoKey> | undefined;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function getSessionSecret() {
  const fromEnv = process.env.ADMIN_SESSION_SECRET;
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET é obrigatório em produção.");
  }

  return "dev-only-admin-session-secret-change-me";
}

function bytesToBase64Url(bytes: Uint8Array) {
  const str = String.fromCharCode(...bytes);
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const str = atob(base64);
  return new Uint8Array([...str].map((ch) => ch.charCodeAt(0)));
}

async function getSigningKey() {
  if (!signingKeyPromise) {
    const secret = new TextEncoder().encode(getSessionSecret());
    signingKeyPromise = crypto.subtle.importKey(
      "raw",
      secret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }

  return signingKeyPromise;
}

async function signPayload(payloadRaw: string) {
  const key = await getSigningKey();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadRaw));
  return bytesToBase64Url(new Uint8Array(signatureBuffer));
}

export function isValidAdminPassword(input: string) {
  return input === getAdminPassword();
}

export async function createAdminSessionToken() {
  const payload: SessionPayload = {
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadRaw = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signPayload(payloadRaw);
  return `${payloadRaw}.${signature}`;
}

export async function verifyAdminSessionToken(token: string | undefined) {
  if (!token) return false;

  const [payloadRaw, signature] = token.split(".");
  if (!payloadRaw || !signature) return false;

  const expected = await signPayload(payloadRaw);
  if (expected !== signature) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadRaw))) as SessionPayload;
    if (payload.role !== "admin") return false;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function requireAdminApiRequest() {
  const allowed = await isAdminAuthenticated();
  if (allowed) return undefined;
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}
