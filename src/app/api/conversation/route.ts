import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A small local/demo guard. Add an external rate limiter before a public launch.
let windowStart = 0;
let sessionsInWindow = 0;
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Next can normalize nextUrl.hostname to localhost in development. Preserve
  // the actual request host for the same-origin check; production sets APP_ORIGIN.
  const allowedOrigin =
    process.env.APP_ORIGIN ||
    `${request.nextUrl.protocol}//${request.headers.get("host")}`;
  if (!origin || origin !== allowedOrigin)
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!key || !agentId)
    return NextResponse.json(
      { error: "Live conversation is not configured" },
      { status: 503 },
    );
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    sessionsInWindow = 0;
  }
  if (++sessionsInWindow > 10)
    return NextResponse.json(
      { error: "Please try again in a minute" },
      { status: 429 },
    );
  try {
    const url = new URL(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
    );
    url.searchParams.set("agent_id", agentId);
    const response = await fetch(url, {
      headers: { "xi-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Provider unavailable");
    const result = await response.json();
    if (
      typeof result.signed_url !== "string" ||
      !result.signed_url.startsWith("wss://")
    )
      throw new Error("Invalid session");
    return NextResponse.json(
      { signedUrl: result.signed_url },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Live conversation is temporarily unavailable" },
      { status: 502 },
    );
  }
}
