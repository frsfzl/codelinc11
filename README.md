# Linc · CodeLinc 11

A conversational life-insurance needs planner with a Lincoln Financial logo and a white, pale-blue, burgundy and orange interface, automatically captured conversation details, and transparent coverage math. Built on the `shivaa` branch. No AWS resources have been created or deployed.

## Run locally

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The guided conversation, calculator, scenario comparison and policy education work without credentials. Refreshing the page clears the in-memory profile and conversation.

```sh
npm test           # Deterministic math, validation, guided units, stale revisions
npm run typecheck
npm run build
npm run test:e2e   # Desktop + mobile customer flows; requires Chrome
```

The browser tests run against an isolated production server on port 3001 with the live agent disabled. Run `npm run build` before `npm run test:e2e`. Microphone and transcription requests are substituted, so the suite does not record your microphone or incur provider usage. Tests were not run for the latest UI and agent changes at the user's request.

## Customer experience

- **Homepage:** a concise, single-screen mission and four offerings with clear calls to begin. Fits desktop, the 847 × 765 compact browser, and phone viewports without hiding overflowing content.
- **Assessment:** a blue gradient matching the homepage, a rounded composer, and a white “Key details” sidebar that fills the available desktop height. New or changed details animate, with updating/updated indicators. The sidebar collapses on phones; its expanded content scrolls within a bounded height.
- **Comparison popups:** click a captured highlight for proportional dollar charts, confirmed coverage totals, a term/whole-life toggle, conceptual duration diagrams, and tradeoffs. Partial charts are labeled; a coverage gap appears only after confirmation. Switching policy type never changes the math or invents premiums.
- **Dictation:** either microphone button replaces only the composer with live English transcription and a glowing microphone. Scribe detects a pause and sends the completed statement automatically to a text-only agent. Linc never generates or plays spoken replies. Muting pauses capture, X returns to typing, and reconnecting preserves the chat and captured details.
- **Conversation-only intake:** Linc asks the relevant questions, captures natural-language answers, and asks for a quick spoken or typed confirmation of the recap. No intake form or review buttons. Unknown values stay unknown and zero means an explicit exclusion.
- **Recommendation:** after confirmation, the exact calculation appears automatically and Linc explains the coverage target, support horizon, relevant policy direction and tradeoffs. Corrections in chat invalidate the previous estimate until reconfirmed.
- **Explainable result:** total needs, resources already in place, additional coverage, line items and assumptions.
- **What-if:** compare a different support period or unavailable employer coverage against the original, one change at a time.
- **Education:** term versus whole life, time-bound versus lifelong needs, affordability context, and links to consumer education.
- **Accessibility:** native modal focus management and Escape behavior, labeled inputs, keyboard controls, visible focus, transcript announcements, responsive layout and reduced-motion support.

Guided mode uses deterministic questions and a limited amount parser; it is **not presented as live AI**. It accepts numbers such as `40k`, `40,000/year`, or `3,000 per month` for annual support/income. More open-ended understanding is handled by the optional live agent.

## ElevenLabs speech-to-text

Both microphone buttons start English dictation. ElevenLabs Scribe v2 Realtime supplies partial words and commits the completed statement after about one second of detected silence. Each committed segment is sent once as a user text message to an ElevenLabs `TextConversation`; any echoed user message is ignored. Partial captions are display-only. A transcription failure stops the connection and offers reconnection or typing. The microphone glow follows measured input volume; its analysis graph is never connected to audio output.

The Node endpoint /api/speech-token issues a short-lived, single-use realtime Scribe token. The API key stays on the server. Tokens and signed session URLs are not stored in the app or logs. Same-origin checks, no-store responses, timeouts, and process-local rate/concurrency limits protect this local demo. Dictation uses Scribe and a text-only agent. There is no agent voice session, synthesized reply audio, or audio playback.

For normal hosting, set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID and APP_ORIGIN in server-only environment variables. Local development also supports the already authenticated native ElevenLabs CLI through ELEVENLABS_USE_CLI=true and ELEVENLABS_CLI_PATH. CLI mode is restricted to loopback origins and invokes the native executable directly without a shell. This workstation’s ignored .env.local enables that bridge.

Pause disconnects both streams and stops audio. Resume opens a fresh provider session with the current profile and up to 24 recent messages; it does not restore the provider’s original session ID. X exits voice and preserves the in-memory chat and typed draft. Reloading the page clears them. The legacy batch /api/transcribe endpoint remains available but is no longer used by the conversation microphone.

The app does not persist audio or transcripts. Provider processing and retention remain subject to account settings. See the [realtime transcription guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming).

## Live text and dictation

1. Create a private ElevenLabs Agent. Use `docs/agent-prompt.md` as its system prompt and register the six client tools in `docs/client-tools.json`. Tool names and types must match exactly. Enable **Wait for response** for each client tool.
2. Configure the `profile_context` dynamic variable with a default of `{}` and `opening_message` with a greeting introducing Linc. Enable text-only conversations. The app always connects with `textOnly: true`, including during dictation; any dashboard voice configuration is unused.
3. Restrict the agent's allowed origins to your development origin. Configure provider retention and recording settings appropriate to the demo before using real information.
4. Copy `.env.example` to `.env.local`, set `ELEVENLABS_AGENT_ID` and either the server-only `ELEVENLABS_API_KEY` or the local authenticated CLI settings above, and set `APP_ORIGIN` to the exact URL origin you open. Restart the server. Do not put secrets in `NEXT_PUBLIC_` variables or commit `.env.local`.
5. Type and send a message to connect automatically, or select **Start voice conversation** or the composer microphone. The browser requests a short-lived signed WebSocket URL from the Node route; the API key stays on the server. Voice begins only after an explicit button press and microphone permission.

The integration uses `@elevenlabs/client` 1.26 with explicitly owned, cancelable session lifecycles. Late connection callbacks and tool calls from ended sessions are ignored. Connection, listening, thinking, disconnection and error states are displayed. The shared profile is sent when a session starts and when it changes. Tool writes validate data and the expected revision; newer corrections cannot be overwritten by stale requests. `review_profile` returns a recap tied to the current revision. `calculate_needs` requires a new affirmative user reply after that recap, quoted exactly; old or invented confirmations are rejected. The calculator returns exact structured results; the prompt tells the agent not to invent arithmetic.

The private **Linc — CodeLinc 11** agent uses six client tools, GPT-4.1 mini, sequential tool calls, and text-only sessions in this application. The ignored local environment points to agent `agent_9101m41qsmf3fkdbpwx13xy5n9k3`. Server-side signing can use the authenticated native CLI in local development. Microphone audio goes only to Scribe transcription, and Linc's replies remain text. Provider retention is controlled separately in the account.

Automated tests and live microphone sessions were skipped for these changes at the user’s request. The new realtime captions, automatic voice turns, and pause/reconnect flow have not been exercised end to end. Earlier batch transcription was separately verified before this change. Provider processing/retention is separate from the app's in-memory state; refreshing this page does not delete provider records.

Official integration references: [React SDK](https://elevenlabs.io/docs/eleven-agents/libraries/react), [client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools).

## Calculation and its limits

```text
total needs = annual family support × years
            + mortgage + other debts + education
            + final expenses + other goals

resources   = employer coverage + personal coverage + allocated savings
additional  = max(0, total needs − resources)
```

Amounts are USD. Support and income are annual, budget is monthly, and other amounts are one-time balances or goals. Income and budget provide context; neither silently changes coverage. Support must exclude balances/goals counted separately. Only savings the customer chooses to allocate are subtracted. Cent precision is retained internally, with rounded whole-dollar display.

The illustrative family has $40,000 annual support for 15 years, a $220,000 mortgage and $80,000 education goal. Other selected needs are explicitly $0. Total needs are $900,000. With $150,000 employer coverage and $50,000 allocated savings, the additional estimate is $700,000. Independently changing to 10 years produces $500,000; independently excluding employer coverage produces $850,000. The original is retained.

This is a simplified educational planning model. It does not model inflation, returns or taxes, sell policies, estimate premiums, assess eligibility, or guarantee adequacy. Employer portability/conversion and actual policy terms require separate review. Education is grounded in the [NAIC consumer guide](https://content.naic.org/consumer/life-insurance.htm), with a [Lincoln Financial product information link](https://www.lincolnfinancial.com/public/individuals/products/lifeinsurance); the prototype is not an insurer or an official Lincoln service.

## Structure

```text
src/app/page.tsx                     Homepage
src/app/conversation/page.tsx        Assessment route and configuration flag
src/app/api/conversation/route.ts    Server-only session signing
src/app/api/transcribe/route.ts      Bounded speech-to-text endpoint
src/components/assessment.tsx        In-memory flow and validated client tools
src/components/key-highlights.tsx    Captured facts only
src/components/insight-view.tsx      Popup charts and policy exploration
src/components/voice-stage.tsx       Live words, glowing microphone, pause and exit
src/app/api/speech-token/route.ts     Single-use realtime transcription tokens
src/lib/realtime-speech.ts            Cancelable realtime caption stream
src/lib/conversation-review.ts       Spoken/typed recap and confirmation guard
src/components/coverage-result.tsx   Explanation and independent scenarios
src/components/education.tsx         Term/whole-life education
src/components/live-conversation.tsx Text-only agent and automatic dictation adapter
src/lib/needs.ts                     Single deterministic calculation boundary
src/lib/guided.ts                    Explicitly non-AI fallback intake
src/lib/transcription.ts             Scribe API and opt-in local CLI adapter
docs/agent-prompt.md                 Personal conversation instructions
docs/client-tools.json               Tool definitions for agent setup
tests/                              Unit and desktop/mobile browser coverage
```

Next.js 15 App Router, TypeScript, React, Tailwind 4, a shadcn/Radix button, Lucide icons and Zod. `postcss` is overridden to a patched compatible 8.x release. There is no database, authentication, tracking, localStorage financial state, purchase flow or deployment script.

## AWS Amplify

`amplify.yml` prepares the production configuration, runs the tests/build, and publishes `.next`. The app uses Node API routes and direct browser-to-provider conversation transport, not Edge APIs or server response streaming. Next.js 15 is within the currently documented [Amplify SSR support range](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html).

For AWS hosting, set `APP_ORIGIN`, `ELEVENLABS_AGENT_ID`, and `ELEVENLABS_SECRET_ARN`. The server reads the key from Secrets Manager using an Amplify SSR compute role; only the secret's ARN enters build artifacts. See [the deployment guide](docs/aws-deployment.md) for IAM roles, GitHub connection, and production checks. The signing endpoint's process-local 10-per-minute cap is only a demo guard: add a durable rate limiter and appropriate access/abuse controls before a wider public launch.
