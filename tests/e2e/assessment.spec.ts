import { expect, test } from "@playwright/test";
test("homepage sections, topic intent, and narrow layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Protect what matters/ }),
  ).toBeVisible();
  await expect(page.locator("#mission")).toContainText("Big decisions deserve");
  await expect(page.locator(".offer-card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "A mortgage", exact: true }).click();
  await expect(page).toHaveURL(/intent=mortgage/);
  await expect(page.locator(".priority-summary")).toContainText("A mortgage");
  await expect(page.locator(".result-card")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
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
