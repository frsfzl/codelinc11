# Planning comparisons and takeaway

Captured highlights open a modal with Your numbers, Your options, and What if. The options section includes a side-by-side policy comparison, a conceptual timeline, and tradeoffs based on the actual support period, priorities, employer coverage, and budget. What-if controls use the existing deterministic calculator and change one assumption at a time. They never modify the confirmed profile.

The permanent sidebar has a finish action. Finishing stops live audio/text and opens a summary. Closing or muting voice and temporary disconnection do not finish the assessment. Incomplete conversations get a progress report without a final coverage amount; complete but unconfirmed inputs are marked Needs confirmation. Continuing and correcting facts invalidates confirmation, so the next report cannot present an obsolete estimate as current.

`src/lib/summary.ts` supplies both the modal and PDF. The PDF is generated locally with a deferred jsPDF import and the existing Lincoln logo; export sends no profile data to another service. Numbers come from the calculator, not an additional model call. The PDF carries the revision and confirmed/incomplete status. Chat and report state remain in memory, so download before refreshing if you want to keep a copy.

Annual education costs use a separate `educationPlan`: annualAmount, years, scope (combined/per-person/unknown), and people when per-person. `update_profile` accepts partial educationPlan updates in its JSON patch. The app computes the total only after the basis is complete. Explicitly unknown fields remain null and appear in the sidebar and summary. A narrow English unit/uncertainty guard catches common corrections before the model writes an amount; open-ended interpretation still belongs to Linc. Agent prompt and client tool schema must be synced from the docs when configuring a different ElevenLabs agent.

Consumer education source: https://content.naic.org/consumer/life-insurance.htm. Policy comparisons are educational and contain no invented premiums or cash-value projections.

Validation for this change: production build and TypeScript checks, manual browser walkthrough, and visual inspection of the generated sample PDF. Automated test suites were not run at the user's request.
