import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSessionToken, isValidAdminPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };

  if (!body.password || !isValidAdminPassword(body.password)) {
    return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
  }

  const token = await createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
