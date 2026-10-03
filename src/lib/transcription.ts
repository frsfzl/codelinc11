import { execFile } from "node:child_process";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_BYTES = MAX_AUDIO_BYTES + 64 * 1024;
const extensions: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
};

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function speechConfigured() {
  return Boolean(
    process.env.ELEVENLABS_API_KEY ||
    (process.env.ELEVENLABS_USE_CLI === "true" &&
      process.env.ELEVENLABS_CLI_PATH),
  );
}

// Bound the stream before parsing multipart data, including chunked uploads.
export async function readAudioUpload(request: Request): Promise<File> {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new TranscriptionError("Please send an audio recording.", 400);
  if (Number(request.headers.get("content-length")) > MAX_UPLOAD_BYTES)
    throw new TranscriptionError(
      "Recording is too large. Try a shorter message.",
      413,
    );
  const reader = request.body?.getReader();
  if (!reader) throw new TranscriptionError("No recording received.", 400);
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw new TranscriptionError(
          "Recording is too large. Try a shorter message.",
          413,
        );
      }
      chunks.push(new Uint8Array(value));
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(new Blob(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new TranscriptionError(
      "The recording could not be read. Please try again.",
      400,
    );
  }
  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0)
    throw new TranscriptionError("No audio recorded. Please try again.", 400);
  if (file.size > MAX_AUDIO_BYTES)
    throw new TranscriptionError(
      "Recording is too large. Try a shorter message.",
      413,
    );
  if (!Object.hasOwn(extensions, file.type.split(";")[0]))
    throw new TranscriptionError("This audio format is not supported.", 415);
  return file;
}

export function transcriptText(value: unknown): string {
  const text =
    value && typeof value === "object" && "text" in value ? value.text : null;
  if (typeof text !== "string" || text.length > 20_000)
    throw new TranscriptionError(
      "The transcription could not be read. Please try again.",
      502,
    );
  if (!text.trim())
    throw new TranscriptionError(
      "No speech was detected. Please try again.",
      422,
    );
  return text.trim();
}

export async function transcribeAudio(
  file: File,
  requestSignal: AbortSignal,
  origin: string,
): Promise<string> {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(55_000)]);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (apiKey) {
    const data = new FormData();
    data.append(
      "file",
      file,
      `recording.${extensions[file.type.split(";")[0]]}`,
    );
    data.append("model_id", "scribe_v2");
    data.append("tag_audio_events", "false");
    data.append("diarize", "false");
    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: data,
        cache: "no-store",
        signal,
      },
    );
    if (!response.ok) {
      if (response.status === 429)
        throw new TranscriptionError(
          "Speech service is busy. Please try again in a minute.",
          429,
        );
      if (response.status === 400 || response.status === 422)
        throw new TranscriptionError(
          "This recording could not be transcribed. Try recording again.",
          422,
        );
      throw new TranscriptionError(
        "Speech-to-text is temporarily unavailable. You can still type.",
        502,
      );
    }
    return transcriptText(await response.json());
  }

  // Explicitly opt-in, loopback-only bridge to an already authenticated local CLI.
  // Use a server API key when hosting; no CLI credentials are read or exported.
  const cliPath = process.env.ELEVENLABS_CLI_PATH;
  if (
    process.env.ELEVENLABS_USE_CLI !== "true" ||
    !cliPath ||
    !["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname)
  )
    throw new TranscriptionError(
      "Speech-to-text is not connected yet. You can still type.",
      503,
    );
  const directory = await mkdtemp(join(tmpdir(), "steady-speech-"));
  const path = join(
    directory,
    `recording.${extensions[file.type.split(";")[0]]}`,
  );
  try {
    await writeFile(path, new Uint8Array(await file.arrayBuffer()));
    const { stdout } = await execute(
      cliPath,
      [
        "speech-to-text",
        "convert",
        "--model-id",
        "scribe_v2",
        "--file",
        path,
        "--tag-audio-events",
        "false",
        "--diarize",
        "false",
        "--format",
        "json",
        "--no-retry",
        "--no-pager",
      ],
      {
        windowsHide: true,
        shell: false,
        timeout: 55_000,
        signal,
        maxBuffer: 1024 * 1024,
      },
    );
    return transcriptText(JSON.parse(stdout));
  } finally {
    await unlink(path).catch(() => {});
    await rmdir(directory).catch(() => {});
  }
}
