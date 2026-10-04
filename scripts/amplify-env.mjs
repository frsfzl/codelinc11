import { writeFileSync } from "node:fs";

// Explicit allowlist: only public configuration and a secret ARN enter the
// deployment artifact. The ElevenLabs key stays in AWS Secrets Manager.
const origin = process.env.APP_ORIGIN;
const agent = process.env.ELEVENLABS_AGENT_ID;
const secret = process.env.ELEVENLABS_SECRET_ARN;
if (
  !origin ||
  new URL(origin).origin !== origin ||
  !origin.startsWith("https://")
) {
  throw new Error("APP_ORIGIN must be the exact production HTTPS origin.");
}
if (!agent || !/^agent_[a-zA-Z0-9]+$/.test(agent)) {
  throw new Error("ELEVENLABS_AGENT_ID is required.");
}
if (
  !secret ||
  !/^arn:aws(?:-[a-z]+)*:secretsmanager:[a-z0-9-]+:\d{12}:secret:[a-zA-Z0-9/_+=.@-]+$/.test(
    secret,
  )
) {
  throw new Error(
    "ELEVENLABS_SECRET_ARN must reference the production API key.",
  );
}
writeFileSync(
  ".env.production",
  [
    `APP_ORIGIN=${origin}`,
    `ELEVENLABS_AGENT_ID=${agent}`,
    `ELEVENLABS_SECRET_ARN=${secret}`,
    "ELEVENLABS_USE_CLI=false",
    "",
  ].join("\n"),
);
console.log(
  "Prepared production configuration. No API keys copied to build artifacts.",
);
