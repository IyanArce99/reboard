import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "@/lib/auth/config";
import { dailyMaintenance } from "@/lib/moderation/service";
import { createServiceClient } from "@/lib/supabase/service";

// Mantenimiento diario (Vercel Cron, vercel.json): caduca anuncios sin confirmar en 30 días,
// borra borradores abandonados con sus fotos y aplica la conservación de 12 meses. Vercel envía `Authorization: Bearer $CRON_SECRET`.

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!authEnabled()) return NextResponse.json({ skipped: "sin base de datos" });
  try {
    const result = await dailyMaintenance(createServiceClient());
    if (result.expired > 0) revalidateTag("listings", "max");
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/expirar]", e);
    return NextResponse.json({ error: "maintenance failed" }, { status: 500 });
  }
}
