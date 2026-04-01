import crypto from "crypto";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  u: string;
  exp: number;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? null;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

export function isAdminCredentialsValid(username: string, password: string): boolean {
  const expectedUser = normalizeCredential(process.env.ADMIN_USERNAME ?? process.env.ADMIN_USER);
  const expectedPassword = normalizeCredential(process.env.ADMIN_PASSWORD ?? process.env.ADMIN_PASS);
  const providedUser = normalizeCredential(username);
  const providedPassword = normalizeCredential(password);

  if (!expectedUser || !expectedPassword) {
    return false;
  }

  return providedUser === expectedUser && providedPassword === expectedPassword;
}

export function isAdminAuthConfigured(): boolean {
  const expectedUser = normalizeCredential(process.env.ADMIN_USERNAME ?? process.env.ADMIN_USER);
  const expectedPassword = normalizeCredential(process.env.ADMIN_PASSWORD ?? process.env.ADMIN_PASS);
  return Boolean(expectedUser && expectedPassword);
}

function normalizeCredential(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function createAdminSessionToken(username: string): string | null {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadEncoded)
    .digest("base64url");

  return `${payloadEncoded}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const secret = getSessionSecret();
  if (!secret) {
    return false;
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadEncoded)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadEncoded)) as SessionPayload;
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
