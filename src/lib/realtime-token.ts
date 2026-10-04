import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getProviderKey } from "./provider-key";

const execute = promisify(execFile);

export async function createRealtimeToken(
  origin: string,
  signal: AbortSignal,
): Promise<string> {
  let result: { token?: unknown };
  const apiKey = await getProviderKey(signal);
  if (apiKey) {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        cache: "no-store",
        signal,
      },
    );
    if (!response.ok) throw new Error("Token unavailable");
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
        "tokens",
        "single-use",
        "create",
        "--token-type",
        "realtime_scribe",
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
  if (typeof result.token !== "string" || !result.token)
    throw new Error("Invalid token");
  return result.token;
}
