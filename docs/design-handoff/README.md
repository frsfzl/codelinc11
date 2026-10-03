# Handoff: LincLife Landing Page + AI Coverage Guide

## Overview
A marketing landing page for LincLife (an AI life-insurance guide, "Powered by CodeLinc") and a conversational assistant. The assistant asks 9 questions one at a time and returns an educational coverage recommendation: coverage amount, policy type and estimated monthly range. It is a single-page app with two screens: **Home** and **Assistant**.

## About the Design Files
The bundled `LincLife Landing.dc.html` is a **design reference built in HTML**. It is a working prototype that shows the intended look and behavior. It is not production code. Recreate it in the target codebase using that codebase's framework and patterns. The original source is a Vite + React 19 + Tailwind v4 app (`src/App.tsx`, `src/index.css`), and continuing in that stack is recommended. The prototype uses inline styles only; map them to Tailwind utilities and the `@theme` tokens below.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy and interactions are final. Match them exactly.

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| brand | `#bc4e25` | Primary buttons, accents, highlight text, assistant avatar |
| brand-dark | `#9d3d1b` | Primary button hover |
| brand-deep | `#3c251d` | User chat bubble background |
| brand-soft | `#fff0e8` | Icon circles, selected chip bg, secondary hover bg |
| canvas | `#fbf8f4` | Home page background, body bg |
| surface | `#f5f1ec` | "How we estimated" inset panel |
| ink | `#25211f` | Primary text |
| muted | `#706964` | Secondary text |
| line | `#e7dfd8` | Borders, dividers |
| success | `#3c7a55` | "AI guide online" dot |
| white | `#ffffff` | Cards, assistant screen bg |

Alpha variants used: brand @ 10% (hero glow), 20% (pill border), 25% (logo circle border), 40% (secondary hover border, chip hover), 50% (composer focus border).

### Typography
- **Sans (body):** "DM Sans", weights 400/500/600/700
- **Display (headings, brand, numbers):** "Manrope", weights 500/600/700
- Google Fonts: `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700&display=swap`
- Body uses `-webkit-font-smoothing: antialiased`

| Element | Font | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| Hero H1 | Manrope | 48 → 60 (sm) → 96px (lg); lh 1.02 | 600 | -0.045em |
| Result H1 | Manrope | 36 → 48px (sm) | 600 | -0.025em |
| Step H2 | Manrope | 24px | 600 | -0.025em |
| Card H2 | Manrope | 20px | 600 | — |
| Stat value | Manrope | 24px | 600 | — |
| Wordmark "LincLife" | Manrope | 18px; lh 1 | 600 | -0.025em |
| Hero lead | DM Sans | 18 / 32px | 400 | — |
| Body / chat | DM Sans | 14 / 24px | 400 (assistant title 600) | — |
| Buttons | DM Sans | 14px | 600 | — |
| Eyebrow / labels | DM Sans | 12px, uppercase | 600–700 | 0.05em–0.18em |
| Wordmark sub "Powered by CodeLinc" | DM Sans | 10px, uppercase | 600 | 0.18em |
| Fine print | DM Sans | 10–11px | 400 | — |

### Radius
- Pills and buttons: `9999px`
- Result card: `24px`
- Composer: `24px`
- User bubble: `24px 24px 6px 24px` (small bottom-right corner)
- Inset panel: `16px`

### Shadows
- Primary button: `0 12px 30px rgba(191,78,35,0.22)`
- Result card: `0 24px 70px rgba(73,48,36,0.10)`
- Composer: `0 16px 50px rgba(61,43,34,0.16)`
- Small pill/avatar: `0 1px 2px rgba(0,0,0,0.05)`

### Spacing
Tailwind 4px scale. Page gutters are 24px (40px at lg) with max widths of 1280px (home), 1024px (assistant header) and 768px (chat column).

## Shared Components

**Brand lockup.** A 36px circle (1px border at brand 25%, brand-soft bg, brand-colored shield icon) with a 12px gap to a two-line text block: "LincLife" and "POWERED BY CODELINC" (4px top margin).

**Button**, min-height 48px, padding 0 24px, pill, 14px/600, `transition: all 200ms`, 8px gap with an optional 16px arrow icon:
- *primary:* brand bg, white text, brand shadow; hover changes the bg to brand-dark
- *secondary:* 1px line border, white bg, ink text; hover changes the border to brand 40% and the bg to brand-soft
- *ghost:* muted text; hover adds a black 5% bg and ink text
- Disabled: opacity 0.4, not-allowed cursor. Focus-visible: 2px brand outline, 2px offset.
- Compact variant (nav and header): min-height 40px, padding 0 16–20px.

**Icons** (inline SVG, 24 viewBox, `currentColor`):
- Shield + check: stroke 1.8. Paths `M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6l-7-3Z` and `m9 12 2 2 4-4`
- Spark (4-point star): filled. `M12 2c.7 5.4 3.6 8.3 9 9-5.4.7-8.3 3.6-9 9-.7-5.4-3.6-8.3-9-9 5.4-.7 8.3-3.6 9-9Z`
- Arrow right: stroke 2. `M5 12h14m-5-5 5 5-5 5`

## Screens

### 1. Home
Background: canvas.

**Nav.** Max-width 1280px, padding 24px, space-between. Brand on the left. On the right (md and up): links "How it works" (anchors to `#how-it-works`) and "Why LincLife", 14px/500 muted with ink on hover, 32px gap, plus a compact secondary button "Start your plan". Below md, only a compact secondary button "Get started" is shown.

**Hero.** Centered column, max-width 896px. Padding top 64px (112px at lg), bottom 96px (128px at lg). Behind it sits a 512px brand-10% circle blurred 64px.
- Pill: "A clearer way to find coverage" with a spark icon. White bg, brand 20% border, brand text 12px/600, padding 8px 16px, 28px bottom margin.
- H1: "Life insurance," + line break + "made easy." The second line is in brand color.
- Lead (28px top margin, max-width 672px, muted): "Meet your personal insurance guide. Answer a few simple questions and get a clear, explainable coverage recommendation—without the jargon."
- CTAs (36px top margin, 12px gap; stacked full-width on mobile): primary "Build my plan →" (min-width 192px), then a text button "See how it works" (anchor; hover adds a white bg).
- Trust row (36px top margin, 12px × 28px gap, 12px/500 muted): "Private & secure" (shield icon), "Takes about 5 minutes", "No commitment". The last two have 6px brand dots.

**How it works** (`id="how-it-works"`). White band with line borders top and bottom. Three columns at md (stacked below), 40px gap, 64px vertical padding. Each column: number (Manrope 14px/600, brand), H2 (20px top margin), body (12px top margin, max-width 384px, muted).
1. 01 · "Tell us about you" · "Share your goals, household needs, health, and comfortable monthly budget."
2. 02 · "See the thinking" · "Your guide explains how each answer shapes your suggested coverage."
3. 03 · "Get a clear next step" · "Review an easy-to-understand recommendation you can feel confident about."

### 2. Assistant
Background: white.

**Header.** Sticky, white at 90% with backdrop blur and a bottom line border. Max-width 1024px, padding 16px 20px. The brand lockup is a button that returns to Home. On the right: a 8px success dot with "AI guide online" (12px/500 muted, hidden below sm), then a compact secondary button "New chat" that resets the conversation.

**Conversation.** Column max-width 768px, 28px gap between messages, 40px top padding and 288px bottom padding (clears the fixed composer).
- *Assistant message:* a 36px brand circle with a white spark icon, 12px gap, then text at max-width 85% (4px top padding). The title is 14px/600 ink; the optional detail is muted with a 6px top margin.
- *User message:* right-aligned, max-width 80%, brand-deep bg, white text, padding 14px 20px, radius 24/24/6/24.
- Each message animates in (see Interactions).

**Composer.** Fixed to the bottom, full width, over a gradient from white to transparent upward. Padding 48px top, 20px bottom, 16px sides. Content max-width 768px.
- *Quick-reply chips* (only when the current question has options): a horizontally scrollable row with 8px gap and 12px bottom margin. Each chip is a pill with a 1px border, padding 8px 16px, 12px/600.
  - Default: line border, white bg, ink text. Hover: brand 40% border.
  - Selected: brand border, brand-soft bg, brand text.
- *Form card:* radius 24px, 1px line border (brand 50% on focus-within), white bg, 8px padding, composer shadow.
  - Textarea with 2 rows, no resize, transparent, padding 8px 16px, 14/24px. Placeholder "Reply or ask a question..." in muted at 60%.
  - Footer row (padding 0 8px 4px): left, a shield icon with "Don't share sensitive medical details" (11px muted). Right, a 40px brand circular send button with an arrow (hover brand-dark; opacity 0.3 and disabled when the draft is empty).
- Fine print below (8px top margin, 10px muted, centered): "LincLife provides educational guidance, not financial or medical advice."
- The composer is hidden once all questions are answered.

**Recommendation** (appended under the chat when done; max-width 768px):
- Header (centered, 32px bottom margin): a 56px brand-soft circle with a brand shield; eyebrow "YOUR STARTING POINT" (brand, 12px/700, 0.18em, 20px top margin); H1 "A plan shaped around you"; sub "Based on what you shared, here's a practical place to begin the conversation with a licensed professional." (max-width 576px, muted).
- Card: white, line border, 24px radius, card shadow, overflow hidden.
  - Stat strip: 3 columns at sm, 1px line gaps (line color as the grid bg), each cell 28px padding. Label (12px uppercase muted) over value (Manrope 24px/600): **Coverage**, **Suggested type**, **Est. monthly**.
  - Body (28px padding; 36px at sm):
    - A row with a 36px brand-soft spark circle next to H2 "Why this could fit" and an explanation paragraph.
    - Surface panel (16px radius, 20px padding, 28px top margin): label "HOW WE ESTIMATED COVERAGE" over a paragraph.
    - Actions (28px top margin, 12px gap, row at sm): primary "Talk with a professional →" (flex 1, no handler yet) and secondary "Start over" (resets the chat).
    - Disclaimer (11px muted, centered, 20px top margin): "This educational estimate is not an offer of coverage or financial advice. Final pricing and eligibility depend on underwriting."

## Interactions & Behavior

### Navigation
- "Start your plan", "Get started" and "Build my plan" switch to the Assistant screen.
- The brand button in the Assistant header returns to Home.
- "How it works" and "See how it works" smooth-scroll to `#how-it-works` (`html { scroll-behavior: smooth }`).

### Chat flow
1. The conversation starts with two assistant messages: the greeting ("Hi, I'm your LincLife guide." with detail "I can help you think through your life insurance needs, explain the tradeoffs, and build a starting recommendation with you. You can answer naturally or ask me questions at any point.") and question 1 with its help text.
2. Clicking a chip sets `draft` to the chip label and `selectedValue` to the chip value. Typing clears `selectedValue`.
3. Enter submits; Shift+Enter inserts a newline. Empty drafts can't be sent.
4. **Question detection:** if no chip is selected and the text ends with "?" or starts with why, what, how, can, could, should, does, do, is, are or will (case-insensitive), the message is treated as a question. The app appends the user message plus an assistant message whose title is the current step's *insight* and whose detail is "When you're ready, {question lowercased}". The step does not advance.
5. **Otherwise** the text is an answer. The app stores `answers[q.id] = selectedValue || text`, then appends the user message plus an assistant message whose title is the step's *acknowledgement* and whose detail is "{next question} {next help}". After the last step the detail is "I've put together a recommendation below and explained how I arrived at it." The step then advances.
6. After each new message or step change, the view auto-scrolls to the bottom (smooth).
7. "New chat" and "Start over" reset the step, answers, draft, selection and messages to the initial state.

### Questions (id · question · help · options [label → value])
1. goal · What matters most to you? · This helps us understand what your coverage needs to protect. · Protect my family→family ("Replace income and cover everyday needs"), Cover my mortgage→mortgage ("Help keep your family in their home"), Leave a legacy→legacy ("Create a lasting financial gift")
2. age · How old are you? · Age is one of the key factors insurers use to estimate cost. · free number
3. height · What is your height in inches? · Height is typically considered alongside other health information during underwriting. · free number (suffix IN)
4. income · What is your annual household income? · A common starting point is coverage equal to 7–10 years of income. · free number ($ prefix, USD suffix)
5. dependents · How many people depend on your income? · Include children, a partner, parents, or anyone you support financially. · Just me→0, 1 person→1, 2 people→2, 3+ people→3
6. health · How would you describe your overall health? · This is only an estimate. A formal application may include additional health questions. · Excellent→excellent, Good→good, Fair→fair
7. medical · Do you have an ongoing medical condition? · A broad answer is enough for this early estimate—you don't need to share a diagnosis here. · No ongoing conditions→none, Yes, well managed→managed, Yes, needs ongoing care→ongoing, Prefer not to say→unspecified
8. tobacco · Have you used tobacco or nicotine recently? · Nicotine use can meaningfully affect life insurance pricing and available policy options. · No→no, Yes→yes, Prefer not to say→unspecified
9. budget · What monthly payment feels manageable? · We'll keep your protection goal grounded in what works for your budget. · Under $50→50, $50–$100→100, $100–$200→200, $200+→250

The option `detail` strings and the prefix/suffix fields exist in the data model but are not displayed in the current UI.

### Insights (shown when the user asks a question)
- goal: Your answers stay private and are only used to shape this educational estimate.
- age: Age is an important factor in both policy options and estimated premium ranges.
- height: Height is usually considered with weight and health history—not used on its own.
- income: Income helps anchor the amount of protection, so the estimate reflects your real life.
- dependents: More dependents can mean a greater need for income replacement and longer protection.
- health: Health can affect eligibility and pricing, but there are options for many health profiles.
- medical: Carriers evaluate each condition differently, including how long it has been stable.
- tobacco: Many carriers have different rate classes for recent nicotine use.
- budget: Term life often offers more coverage per dollar; permanent policies can support lifelong goals.

### Acknowledgements (shown after an answer)
- goal: That gives us a clear goal to work toward.
- age: Thanks—that helps me think about the options and likely cost range.
- height: Got it. That will be considered in context with your other health information.
- income: Thanks. I'll use that to estimate a practical amount of income protection.
- dependents: Understood. I'll account for the people who rely on you.
- health: Thanks for sharing. There are coverage paths for many different health profiles.
- medical: That's helpful, and you don't need to share any private diagnosis details here.
- tobacco: Got it. That can affect rate classes, so it's useful to include.
- budget: That's everything I need to build a useful starting point.

### Recommendation math
```
income   = Number(answers.income) || 75000        // prototype strips non-digits first
mult     = answers.dependents === "0" ? 6 : 9
coverage = round(income * mult / 50000) * 50000
term     = answers.goal !== "legacy" || Number(answers.budget) <= 100
age      = Number(answers.age) || 35
low      = max(22, round(coverage/100000 * age/30 * (health === "fair" ? 2.1 : 1.25)))
adj      = (medical === "ongoing" || tobacco === "yes") ? 1.45 : 1
high     = round(low * 1.35 * adj)
```
- Coverage is displayed as `$` plus the number with locale thousands separators. The type is "Term life" or "Whole life". The monthly estimate is shown as `$low–$high`.
- **Why (term):** "Term life prioritizes more coverage at a typically lower initial cost. With {dependents==="0" ? "no dependents currently" : "{n} or more people relying on your income"}, it can help protect your highest-need years without stretching your budget."
- **Why (whole):** "Whole life may support your goal of leaving a legacy because it offers lifelong coverage and can build cash value over time, though premiums are generally higher than term insurance."
- **How:** "We started with {6|9} years of your reported income, then considered your protection goal, number of dependents, age, health, and monthly comfort range."

### Animation
- Enter animation on each message and on the recommendation block: `@keyframes enter { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }`, 450ms, `cubic-bezier(0.22,1,0.36,1)`, fill both.
- Buttons use `transition: all 200ms`; chips transition their colors.
- Under `prefers-reduced-motion: reduce`, set animation and transition durations to 0.01ms and turn off smooth scroll.

### Responsive
- Below md, the nav collapses to a single "Get started" button and the steps stack into one column.
- Below sm, the hero CTAs stack full-width, the stat strip stacks, the result actions stack, and "AI guide online" is hidden.
- Body min-width is 320px.

## State Management
- `screen: "home" | "assistant"`
- `step: number` (0–9). `done = step >= questions.length`
- `answers: Record<questionId, string>`
- `draft: string`, `selectedValue: string`
- `messages: { role: "assistant" | "user"; content: string; detail?: string }[]`

There is no data fetching; the whole flow runs on the client. The "Talk with a professional" CTA needs a destination (booking flow or contact form) to be defined.

## Assets
There are no raster images. All icons are the inline SVGs listed above, and fonts load from Google Fonts.

## Files
- `LincLife Landing.dc.html` is the interactive HTML prototype. Open it in a browser. It has two tweakable props, `startScreen` (home or assistant) and `showQuickReplies` (boolean), which exist for review only.
- `reference/App.tsx` and `reference/index.css` are the original React and Tailwind source the prototype was rebuilt from. Treat them as the canonical source for class names and theme tokens.
