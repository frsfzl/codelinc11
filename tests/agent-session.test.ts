import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgentSession } from "../src/lib/agent-session";

test("private agent signing keeps credentials server-side and validates the socket destination", async (t) => {
  const previousKey = process.env.ELEVENLABS_API_KEY;
  const previousAgent = process.env.ELEVENLABS_AGENT_ID;
  process.env.ELEVENLABS_API_KEY = "server-test-key";
  process.env.ELEVENLABS_AGENT_ID = "agent_test";
  let signed = "wss://api.elevenlabs.io/v1/convai/conversation?token=test";
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.searchParams.get("agent_id"), "agent_test");
    assert.equal(
      new Headers(init.headers).get("xi-api-key"),
      "server-test-key",
    );
    assert.equal(init.cache, "no-store");
    return Response.json({ signed_url: signed });
  });
  try {
    assert.equal(
      await createAgentSession(
        "http://127.0.0.1:3000",
        new AbortController().signal,
      ),
      signed,
    );
    signed = "wss://untrusted.invalid/conversation";
    await assert.rejects(
      createAgentSession("http://127.0.0.1:3000", new AbortController().signal),
      /Invalid session destination/,
    );
    delete process.env.ELEVENLABS_API_KEY;
    await assert.rejects(
      createAgentSession("https://example.com", new AbortController().signal),
      /Local authentication unavailable/,
    );
  } finally {
    if (previousKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previousKey;
    if (previousAgent === undefined) delete process.env.ELEVENLABS_AGENT_ID;
    else process.env.ELEVENLABS_AGENT_ID = previousAgent;
  }
});
