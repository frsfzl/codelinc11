# Steady · CodeLinc 11

A conversational life-insurance needs planner with a calm white-and-burnt-orange interface, editable customer inputs, and transparent coverage math. Built on the `shivaa` branch. No AWS resources have been created or deployed.

## Run locally

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The entire guided assessment, fictional walkthrough, calculator, scenario comparison and policy education work without credentials. Refreshing the page clears the in-memory profile and conversation.

```sh
npm test           # Deterministic math, validation, guided units, stale revisions
npm run typecheck
npm run build
npm run test:e2e   # Desktop + mobile customer flows; requires Chrome
```

The browser tests use a local server and a fresh browser context. Run them with live credentials absent. On a machine without Chrome, install Chrome or change the Playwright configuration to an installed Chromium browser. To test a production build, run `npm run build`, then `npm start`, then the browser tests against that server.

## Customer experience

- **Homepage:** mission, four offerings, conversation preview, topic entry points, and clear calls to begin.
- **Assessment:** conversational intake plus a live, editable “Your situation” panel; collapsed by default on phones.
- **Review:** unknown values remain blank, zero means an explicit exclusion, and final calculation requires the customer's confirmation.
- **Explainable result:** total needs, resources already in place, additional coverage, line items and assumptions.
- **What-if:** compare a different support period or unavailable employer coverage against the original, one change at a time.
- **Education:** term versus whole life, time-bound versus lifelong needs, affordability context, and links to consumer education.
- **Accessibility:** native modal focus management and Escape behavior, labeled inputs, keyboard controls, visible focus, transcript announcements, responsive layout and reduced-motion support.

The “Try an example” flow is explicitly fictional. Guided mode uses deterministic questions and a limited amount parser; it is **not presented as live AI**. It accepts numbers such as `40k`, `40,000/year`, or `3,000 per month` for annual support/income. More open-ended understanding is handled by the optional live agent.

## Optional live voice and text

1. Create a private ElevenLabs Agent. Use `docs/agent-prompt.md` as its system prompt and register the five client tools in `docs/client-tools.json`. Tool names and types must match exactly. Enable **Wait for response** for each client tool.
2. Configure the `profile_context` dynamic variable with a default of `{}`. Enable text-only conversations so the same agent supports typing without microphone access. Choose a voice/model in the ElevenLabs dashboard; no voice ID or model is hard-coded in this repo.
3. Restrict the agent's allowed origins to your development origin. Configure provider retention and recording settings appropriate to the demo before using real information.
4. Copy `.env.example` to `.env.local`, set `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID`, and set `APP_ORIGIN` to the exact URL origin you open. Restart the server. Do not put secrets in `NEXT_PUBLIC_` variables or commit `.env.local`.
5. Select **Connect live text** or **Start voice conversation**. The browser requests a short-lived signed WebSocket URL from the Node route; the API key stays on the server. Voice begins only after an explicit button press and microphone permission.

The integration uses `@elevenlabs/react` 1.16 with `ConversationProvider`. Connection, listening, thinking, speaking, disconnection and error states are displayed. The shared profile is sent when a session starts and when it changes. Tool writes validate data and the expected revision; newer form edits cannot be overwritten by stale requests. An open profile editor blocks agent writes. Confirmation can only happen in the interface, not through an agent tool. The calculator returns exact structured results; the prompt tells the agent not to invent arithmetic.

Live conversation requires a configured agent and credentials and must be acceptance-tested after setup. This repository does not create an agent or demonstrate that a real provider session has succeeded. Only guided mode, math, UI flows and the unconfigured API behavior have been locally verified. Provider processing/retention is separate from the app's in-memory state; clearing this page does not delete provider records.

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
src/components/assessment.tsx        In-memory flow and validated client tools
src/components/profile-editor.tsx    Editable, confirmable profile
src/components/coverage-result.tsx   Explanation and independent scenarios
src/components/education.tsx         Term/whole-life education
src/components/live-conversation.tsx ElevenLabs adapter, loaded on configured builds
src/lib/needs.ts                     Single deterministic calculation boundary
src/lib/guided.ts                    Explicitly non-AI fallback intake
docs/agent-prompt.md                 Personal conversation instructions
docs/client-tools.json               Tool definitions for agent setup
tests/                              Unit and desktop/mobile browser coverage
```

Next.js 15 App Router, TypeScript, React, Tailwind 4, a shadcn/Radix button, Lucide icons and Zod. `postcss` is overridden to a patched compatible 8.x release. There is no database, authentication, tracking, localStorage financial state, purchase flow or deployment script.

## AWS later

`amplify.yml` is a proposed build specification for a future Amplify Hosting deployment. It runs the tests/build and publishes `.next`. The app uses Node API routes and direct browser-to-provider conversation transport, not Edge APIs or server response streaming. Next.js 15 is within the currently documented [Amplify SSR support range](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html).

Before enabling a public live demo, configure the actual production origin, make server-side provider credentials available in the SSR runtime through a supported secret mechanism, and confirm the provider's origin and retention settings. Amplify build environment variables should not be assumed to exist automatically in the SSR runtime. The signing endpoint's process-local 10-per-minute cap is only a demo guard: add a durable rate limiter and appropriate access/abuse controls before public use. Deployment, runtime secret wiring and a live-provider smoke test remain separate follow-up work.
