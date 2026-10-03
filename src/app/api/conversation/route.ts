import { NextRequest, NextResponse } from "next/server";
import { agentConfigured, createAgentSession } from "@/lib/agent-session";
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
  if (!agentConfigured())
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
    const signedUrl = await createAgentSession(
      origin,
      AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
    );
    return NextResponse.json(
      { signedUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Live conversation is temporarily unavailable" },
      { status: 502 },
    );
  }
}
