import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { speechConfigured } from "./transcription";
import { getProviderKey } from "./provider-key";

const execute = promisify(execFile);
export function agentConfigured() {
  return Boolean(process.env.ELEVENLABS_AGENT_ID && speechConfigured());
}

export async function createAgentSession(
  origin: string,
  signal: AbortSignal,
): Promise<string> {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) throw new Error("Agent not configured");
  let result: { signed_url?: unknown };
  const apiKey = await getProviderKey(signal);
  if (apiKey) {
    const url = new URL(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
    );
    url.searchParams.set("agent_id", agentId);
    const response = await fetch(url, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new Error("Session unavailable");
    result = await response.json();
  } else {
    const cliPath = process.env.ELEVENLABS_CLI_PATH;
    if (
      process.env.ELEVENLABS_USE_CLI !== "true" ||
      !cliPath ||
      !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)
    )
      throw new Error("Local authentication unavailable");
    const { stdout } = await execute(
      cliPath,
      [
        "agents",
        "conversations",
        "get_signed_url",
        "--agent-id",
        agentId,
        "--format",
        "json",
        "--no-retry",
        "--no-pager",
      ],
      {
        windowsHide: true,
        shell: false,
        timeout: 12_000,
        signal,
        maxBuffer: 64 * 1024,
      },
    );
    result = JSON.parse(stdout);
  }
  if (typeof result.signed_url !== "string") throw new Error("Invalid session");
  const url = new URL(result.signed_url);
  if (url.protocol !== "wss:" || url.hostname !== "api.elevenlabs.io")
    throw new Error("Invalid session destination");
  return result.signed_url;
}
