import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  isAdminAuthConfigured,
  isAdminCredentialsValid,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!isAdminAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Admin auth is not configured. Set ADMIN_USERNAME/ADMIN_PASSWORD (or ADMIN_USER/ADMIN_PASS).",
        },
        { status: 500 },
      );
    }

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !isAdminCredentialsValid(username, password)
    ) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createAdminSessionToken(username);
    if (!token) {
      return NextResponse.json({ error: "Admin auth is not configured" }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: getSessionCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionTtlSeconds(),
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
