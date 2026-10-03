import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_AUDIO_BYTES,
  readAudioUpload,
  transcribeAudio,
  transcriptText,
} from "../src/lib/transcription";
import { POST } from "../src/app/api/transcribe/route";

function upload(file: Blob) {
  const data = new FormData();
  data.append("audio", file, "recording");
  return new Request("http://127.0.0.1:3000/api/transcribe", {
    method: "POST",
    body: data,
    headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
  });
}
test("audio intake rejects empty, unsupported, and oversized bodies", async () => {
  await assert.rejects(
    readAudioUpload(upload(new Blob([], { type: "audio/webm" }))),
    { status: 400 },
  );
  await assert.rejects(
    readAudioUpload(upload(new Blob(["text"], { type: "text/plain" }))),
    { status: 415 },
  );
  await assert.rejects(
    readAudioUpload(
      upload(
        new Blob([new Uint8Array(MAX_AUDIO_BYTES + 100_000)], {
          type: "audio/webm",
        }),
      ),
    ),
    { status: 413 },
  );
  const audio = await readAudioUpload(
    upload(new Blob(["audio bytes"], { type: "audio/webm;codecs=opus" })),
  );
  assert.equal(audio.size, 11);
});
test("transcript validation distinguishes silence from malformed responses", () => {
  assert.equal(transcriptText({ text: " My partner. " }), "My partner.");
  assert.throws(() => transcriptText({ text: "  " }), { status: 422 });
  assert.throws(() => transcriptText({ words: [] }), { status: 502 });
});
test("API uploads audio to Scribe v2, returns only the transcript, and hides provider errors", async (t) => {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "test-server-only-key";
  let providerStatus = 200;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls++;
    assert.equal(url, "https://api.elevenlabs.io/v1/speech-to-text");
    assert.equal(
      new Headers(init.headers).get("xi-api-key"),
      "test-server-only-key",
    );
    const form = init.body as FormData;
    assert.equal(form.get("model_id"), "scribe_v2");
    assert.equal(form.get("tag_audio_events"), "false");
    assert.equal(form.get("diarize"), "false");
    assert.ok(form.get("file") instanceof File);
    return Response.json(
      providerStatus === 200
        ? { text: "My family", words: [], language_code: "eng" }
        : { detail: "private provider debug information" },
      { status: providerStatus },
    );
  });
  try {
    const response = await POST(
      upload(new Blob(["recording"], { type: "audio/webm" })),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: "My family" });
    assert.equal(response.headers.get("cache-control"), "no-store");
    providerStatus = 401;
    const failure = await POST(
      upload(new Blob(["recording"], { type: "audio/webm" })),
    );
    assert.equal(failure.status, 502);
    assert.doesNotMatch(await failure.text(), /private provider/);
    const wrongOrigin = upload(new Blob(["recording"], { type: "audio/webm" }));
    wrongOrigin.headers.set("origin", "https://untrusted.invalid");
    assert.equal((await POST(wrongOrigin)).status, 403);
    assert.equal(calls, 2);
  } finally {
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  }
});
test("local CLI bridge cannot run for a hosted origin", async () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  try {
    await assert.rejects(
      transcribeAudio(
        new File(["audio"], "audio.webm", { type: "audio/webm" }),
        new AbortController().signal,
        "https://example.com",
      ),
      { status: 503 },
    );
  } finally {
    if (previous !== undefined) process.env.ELEVENLABS_API_KEY = previous;
  }
});
