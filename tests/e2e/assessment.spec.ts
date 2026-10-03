import { expect, test } from "@playwright/test";
test("homepage fits one screen with mission, offerings and clear entry points", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Protect what matters/ }),
  ).toBeVisible();
  await expect(page.locator("#mission")).toContainText(
    "Make life insurance easier",
  );
  await expect(page.locator(".overview-offer")).toHaveCount(4);
  await expect(page.locator(".conversation-preview")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= window.innerWidth &&
        document.documentElement.scrollHeight <= window.innerHeight,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "I prefer to type", exact: true })
    .click();
  await expect(page).toHaveURL(/mode=text/);
  await expect(page.getByRole("log")).toContainText("Who would you want");
  await expect(page.locator(".result-card")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("homepage also fits the user's compact desktop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 847, height: 765 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("captured highlights open full-page charts and policy tradeoffs without guessing a gap", async ({
  page,
}) => {
  await page.goto("/conversation?mode=text");
  const sidebar = page.locator(".situation-details");
  if (!(await sidebar.evaluate((el) => (el as HTMLDetailsElement).open)))
    await sidebar.locator("summary").click();
  await expect(page.locator(".highlight-card")).toHaveCount(0);
  await expect(sidebar).not.toContainText("Not provided");
  await page
    .getByRole("textbox", { name: "Your message", exact: true })
    .fill("My partner");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".highlight-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Explore people & priorities" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("My partner");
  await expect(dialog.locator(".insight-metrics")).toHaveCount(0);
  expect(
    await dialog.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return (
        box.x === 0 &&
        box.y === 0 &&
        Math.abs(box.width - innerWidth) < 1 &&
        Math.abs(box.height - innerHeight) < 1
      );
    }),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Whole life", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Whole life: what to weigh" }),
  ).toBeVisible();
  await expect(dialog.locator(".duration-diagram")).toHaveClass(/whole/);
  await dialog.getByRole("button", { name: "Back to conversation" }).click();
  await page
    .getByRole("button", { name: "Try an example", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review my numbers", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm & see estimate" }).click();
  await page
    .getByRole("button", { name: "Explore your coverage picture" })
    .click();
  await expect(dialog.locator(".metric-emphasis strong")).toHaveText(
    "$700,000",
  );
  await expect(dialog.locator(".amount-chart.needs")).toContainText("$600,000");
  await expect(dialog.locator(".amount-chart.needs")).toContainText(
    "$40,000 a year × 15 years",
  );
  await dialog.getByRole("button", { name: "Whole life", exact: true }).click();
  await expect(dialog.locator(".metric-emphasis strong")).toHaveText(
    "$700,000",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
test("fictional example confirms inputs, explains math, and keeps scenarios independent", async ({
  page,
}) => {
  await page.goto("/conversation");
  await page
    .getByRole("button", { name: "Try an example", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review my numbers", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#field-annualSupport")).toHaveValue("40000");
  await page.getByRole("button", { name: "Confirm & see estimate" }).click();
  await expect(page.locator(".result-amount")).toHaveText("$700,000");
  await expect(page.locator(".math-equation")).toContainText("$900,000");
  await expect(page.locator(".math-equation")).toContainText("$200,000");
  await page
    .getByRole("button", { name: "Change support period", exact: true })
    .click();
  await expect(page.locator(".scenario-result strong")).toHaveText("$500,000");
  await page
    .getByRole("button", { name: "Without employer coverage", exact: true })
    .click();
  await expect(page.locator(".scenario-result strong")).toHaveText("$850,000");
  await expect(page.locator(".result-amount")).toHaveText("$700,000");
  await page
    .getByRole("button", { name: "Where do term and whole life fit?" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "15 years of family support",
  );
  await expect(
    page.getByRole("heading", { name: "Term life", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close education" }).click();
  if (!(await page.locator(".situation-details").getAttribute("open"))) {
    if (
      !(await page
        .getByRole("button", { name: "Edit inputs", exact: true })
        .isVisible())
    )
      await page.locator(".situation-details > summary").click();
  }
  await page.getByRole("button", { name: "Edit inputs", exact: true }).click();
  await page.locator("#field-years").fill("10");
  await page
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  await expect(page.locator(".result-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review my numbers", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm & see estimate" }).click();
  await expect(page.locator(".result-amount")).toHaveText("$500,000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("guided typing, monthly units, missing fields and reset", async ({
  page,
}) => {
  await page.goto("/conversation?mode=text");
  await expect(page.locator(".session-label")).toContainText("NOT LIVE AI");
  const message = page.getByRole("textbox", {
    name: "Your message",
    exact: true,
  });
  for (const answer of [
    "My partner and children",
    "skip",
    "$3,000 per month",
  ]) {
    await message.fill(answer);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
  }
  await expect(page.getByRole("log")).toContainText("$36,000 per year");
  await page
    .getByRole("button", { name: "Review & fill in my numbers" })
    .click();
  await page.getByRole("button", { name: "Confirm & see estimate" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Please fill in",
  );
  await page.locator("#field-years").fill("-1");
  await page.getByRole("button", { name: "Confirm & see estimate" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "whole number of years",
  );
  await page.getByRole("button", { name: "Close profile editor" }).click();
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page.getByRole("button", { name: "Clear & start fresh" }).click();
  await expect(page.locator(".welcome")).toBeVisible();
  await expect(page.locator(".result-card")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test("missing voice configuration leaves useful guided assessment available", async ({
  page,
  request,
}) => {
  await page.goto("/conversation");
  await page
    .getByRole("button", { name: "Start voice conversation", exact: true })
    .first()
    .click();
  await expect(page.locator(".connection-error")).toContainText(
    "Live conversation isn’t connected",
  );
  await page.getByRole("textbox", { name: "Your message" }).click();
  await expect(
    page.getByRole("textbox", { name: "Your message" }),
  ).toBeFocused();
  const badOrigin = await request.post("/api/conversation", {
    headers: { origin: "https://untrusted.invalid" },
  });
  expect(badOrigin.status()).toBe(403);
  const unconfigured = await request.post("/api/conversation", {
    headers: { origin: "http://127.0.0.1:3000" },
  });
  expect(unconfigured.status()).toBe(503);
});
