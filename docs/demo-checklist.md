# Demo and requirements walkthrough

## Recommended demo (no credentials required)

1. Open the homepage. Show the mission, four offerings and conversation entry points.
2. Open the conversation. Point out the Key details panel and the Linc assistant.
3. Describe a fictional family in chat. Let Linc collect the illustrative values from the README with follow-up questions, including explicit zeros for excluded needs.
4. Answer “Yes, those numbers look right” after Linc summarizes the fictional inputs. Show $900,000 needs minus $200,000 resources = $700,000 estimated additional coverage. Expand/read the line items and assumptions.
5. Change the support period to 10 years: $500,000. Then choose “Without employer coverage”: $850,000 relative to the original 15-year profile. Explain why the scenarios do not compound.
6. Click a captured key detail to open the comparison popup and toggle term versus whole life. Connect the 15-year support goal to time-bound protection while discussing lifelong needs and affordability as separate considerations.
7. Correct an amount in chat. Updating it invalidates the result; a new recap and chat confirmation recalculates it. Show how missing values differ from explicit zero.
8. In an unconfigured guided preview, refresh the page. Type a family description, skip optional income, and enter `3,000 per month` for family support. The next message shows $36,000 per year for review.

## Requirement coverage

| Area                    | Implementation                                                                                                        | Status                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Personal intake         | Dependents, income, annual support, debts, goals, existing coverage, savings, optional budget/priorities              | Conversation-only intake implemented; live agent configured; acceptance checks pending |
| Clear math              | Shared deterministic module, explicit units, line items, review, assumptions, zero floor                              | Implemented and tested                                                                 |
| Personalized reasoning  | Family context, priorities, support period and budget; agent prompt for adaptive follow-ups                           | Deterministic education implemented; live agent configured; behavior unverified        |
| Personable conversation | Warm language, one question at a time, skip/unknown handling, no fear or sales pressure                               | Guided flow implemented; live behavior unverified                                      |
| What-if exploration     | Support period and hypothetical employer-coverage loss compared independently to original                             | Implemented and tested                                                                 |
| Policy tradeoffs        | Term/whole-life comparison tied to entered support period and optional budget                                         | Implemented                                                                            |
| Voice/text experience   | ElevenLabs session-signing route, browser SDK, transcript, client tools, states and fallback                          | Integration code complete; live provider unverified                                    |
| Simple, accessible UI   | Lincoln palette, logo, Linc chat bubbles and comparison popups, captured summary, responsive layout, keyboard dialogs | Latest changes not tested at user request                                              |
| Future AWS hosting      | Amplify build file and documented runtime considerations                                                              | Prepared only; not deployed                                                            |

## Live-agent acceptance checklist (after credentials/configuration)

- Give income, dependents, mortgage and employer coverage in one utterance. Confirm only supplied fields change and follow-ups do not repeat them.
- Say “I don’t know.” Check that the field stays unknown and the assistant clarifies without inventing a value.
- Supply monthly support. Check that the assistant clarifies/converts units and asks for review.
- Correct a value while a previous agent response is pending. Check stale tool requests fail and the newer value wins.
- Confirm an old recap after changing a number. Check the outdated confirmation is rejected.
- Try to get an estimate before confirming. Check the tool refuses and the assistant recaps the numbers in chat and waits for confirmation.
- Check voice-to-text transition, mute/permission denial or disconnect, reconnect, and continued typing.
- Ask for a premium or guaranteed eligibility. Check it explains that this tool estimates coverage needs, not underwriting or pricing.
- Compare each scenario, and check that spoken amounts match the visible deterministic results.
- Ask about limited budget and lifelong dependent support. Evaluate whether tradeoffs are specific, balanced and pressure-free.

Do not describe the live-agent checklist as passed until a configured provider session has actually been tested.
