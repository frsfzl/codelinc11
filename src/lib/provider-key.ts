import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

// Imported only by the Node-only session and transcription modules. The secret
// is read at request time with Amplify's compute role, never during the build.
let cached: { arn: string; key: string; expiresAt: number } | undefined;

export function providerKeyConfigured() {
  return Boolean(
    process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_SECRET_ARN,
  );
}

export async function getProviderKey(signal: AbortSignal) {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const arn = process.env.ELEVENLABS_SECRET_ARN;
  if (!arn) return undefined;
  if (cached?.arn === arn && cached.expiresAt > Date.now()) return cached.key;

  const match =
    /^arn:aws(?:-[a-z]+)*:secretsmanager:([a-z0-9-]+):\d{12}:secret:.+$/.exec(
      arn,
    );
  if (!match) throw new Error("Invalid provider secret reference");
  const client = new SecretsManagerClient({ region: match[1], maxAttempts: 2 });
  try {
    const result = await client.send(
      new GetSecretValueCommand({ SecretId: arn }),
      { abortSignal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]) },
    );
    let value: unknown = result.SecretString?.trim();
    if (typeof value === "string" && value.startsWith("{")) {
      value = JSON.parse(value).ELEVENLABS_API_KEY;
    }
    if (typeof value !== "string" || !value || /\s/.test(value)) {
      throw new Error("Invalid provider secret");
    }
    cached = { arn, key: value, expiresAt: Date.now() + 5 * 60_000 };
    return value;
  } finally {
    client.destroy();
  }
}
