import { NextResponse } from "next/server";
import { z } from "zod";
import { createWeek, listWeeks } from "@/lib/db/queries";
import { requireAdminApiRequest } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(3),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const items = await listWeeks();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const authError = await requireAdminApiRequest();
  if (authError) return authError;

  const payload = createSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const week = await createWeek(payload.data);
  return NextResponse.json({ week }, { status: 201 });
}
