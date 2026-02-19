import { NextResponse } from "next/server";
import { parseWhatsappExceptionText } from "@/lib/exceptions/whatsapp-parser";
import { requireAdminApiRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as { text?: string };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
  }

  const parsed = parseWhatsappExceptionText(body.text);
  return NextResponse.json({ parsed });
}
