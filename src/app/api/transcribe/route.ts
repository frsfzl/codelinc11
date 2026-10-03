import {
  readAudioUpload,
  speechConfigured,
  transcribeAudio,
  TranscriptionError,
} from "@/lib/transcription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let windowStart = 0;
let requests = 0;
let active = 0;
const json = (body: object, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin =
    process.env.APP_ORIGIN ||
    `${new URL(request.url).protocol}//${request.headers.get("host")}`;
  if (!origin || origin !== allowedOrigin)
    return json({ error: "Origin not allowed" }, 403);
  if (!speechConfigured())
    return json(
      { error: "Speech-to-text is not connected yet. You can still type." },
      503,
    );
  // Process-local demo guard; replace with a durable limiter before public use.
  if (Date.now() - windowStart > 60_000) {
    windowStart = Date.now();
    requests = 0;
  }
  if (active >= 2 || ++requests > 10)
    return json({ error: "Please try again in a minute." }, 429);
  active++;
  try {
    const file = await readAudioUpload(request);
    const text = await transcribeAudio(file, request.signal, origin);
    return json({ text });
  } catch (error) {
    if (error instanceof TranscriptionError)
      return json({ error: error.message }, error.status);
    // Provider responses and subprocess errors can contain sensitive information.
    return json(
      {
        error:
          "Speech-to-text is temporarily unavailable. Please try again or type your message.",
      },
      502,
    );
  } finally {
    active--;
  }
}
