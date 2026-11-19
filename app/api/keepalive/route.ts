import { createClient } from "@supabase/supabase-js";

/** Llamado a diario por Vercel Cron para que Supabase no pause el proyecto gratuito. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await sb.rpc("keepalive");
  return Response.json({ ok: !error, error: error?.message ?? null });
}
