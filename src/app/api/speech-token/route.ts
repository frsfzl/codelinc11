import { createRealtimeToken } from "@/lib/realtime-token";
import { speechConfigured } from "@/lib/transcription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let windowStart = 0;
let requests = 0;
let active = 0;
const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowed =
    process.env.APP_ORIGIN ||
    `${new URL(request.url).protocol}//${request.headers.get("host")}`;
  if (!origin || origin !== allowed)
    return json({ error: "Origin not allowed" }, 403);
  if (!speechConfigured())
    return json({ error: "Live transcription is not configured." }, 503);
  if (Date.now() - windowStart > 60_000) {
    windowStart = Date.now();
    requests = 0;
  }
  if (active >= 2 || ++requests > 20)
    return json({ error: "Please try again in a minute." }, 429);
  active++;
  try {
    return json({
      token: await createRealtimeToken(
        origin,
        AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
      ),
    });
  } catch {
    return json(
      { error: "Live transcription is temporarily unavailable." },
      502,
    );
  } finally {
    active--;
  }
}
