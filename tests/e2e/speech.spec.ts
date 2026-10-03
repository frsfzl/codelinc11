import { expect, test, type Page } from "@playwright/test";

async function mockMicrophone(page: Page, denied = false) {
  await page.addInitScript(
    ({ denied }) => {
      const state = { stopped: 0 };
      Object.assign(window, { microphoneTest: state });
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: async () => {
            if (denied) throw new DOMException("Denied", "NotAllowedError");
            return { getTracks: () => [{ stop: () => state.stopped++ }] };
          },
        },
      });
      class Recorder {
        static isTypeSupported() {
          return true;
        }
        state = "inactive";
        mimeType = "audio/webm;codecs=opus";
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          queueMicrotask(() => {
            this.ondataavailable?.({
              data: new Blob([new Uint8Array(1024)], { type: this.mimeType }),
            });
            this.onstop?.();
          });
        }
      }
      Object.assign(window, { MediaRecorder: Recorder });
    },
    { denied },
  );
}

async function record(page: Page) {
  await page.getByRole("button", { name: "Dictate a message" }).click();
  await expect(page.getByRole("status")).toContainText("Recording");
  await page.waitForTimeout(300);
  await page
    .getByRole("button", { name: "Stop recording and transcribe" })
    .click();
}

test("dictation appends a reviewed draft, releases the mic and never sends automatically", async ({
  page,
}) => {
  await mockMicrophone(page);
  await page.route("**/api/transcribe", async (route) => {
    expect(route.request().headers()["content-type"]).toContain(
      "multipart/form-data",
    );
    expect(route.request().postDataBuffer()?.length).toBeGreaterThan(1024);
    await route.fulfill({ json: { text: "my two children" } });
  });
  await page.goto("/conversation?mode=text");
  const message = page.getByRole("textbox", {
    name: "Your message",
    exact: true,
  });
  await message.fill("My partner and");
  await record(page);
  await expect(message).toHaveValue("My partner and my two children");
  await expect(page.locator(".message.user")).toHaveCount(0);
  await expect(message).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { microphoneTest: { stopped: number } })
          .microphoneTest.stopped,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(
    "My partner and my two children",
  );
});

test("cancel discards recordings and late transcription results", async ({
  page,
}) => {
  await mockMicrophone(page);
  let requests = 0;
  let respond: (() => void) | undefined;
  await page.route("**/api/transcribe", async (route) => {
    requests++;
    await new Promise<void>((resolve) => {
      respond = resolve;
    });
    await route
      .fulfill({ json: { text: "Discard this transcript" } })
      .catch(() => {});
  });
  await page.goto("/conversation");
  await page.getByRole("button", { name: "Dictate a message" }).click();
  await expect(page.getByRole("status")).toContainText("Recording");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(requests).toBe(0);
  await record(page);
  await expect.poll(() => requests).toBe(1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const message = page.getByRole("textbox", {
    name: "Your message",
    exact: true,
  });
  await message.fill("Keep this draft");
  respond?.();
  await page.waitForTimeout(100);
  await expect(message).toHaveValue("Keep this draft");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { microphoneTest: { stopped: number } })
          .microphoneTest.stopped,
    ),
  ).toBe(2);
});

test("permission denial keeps typing available", async ({ page }) => {
  await mockMicrophone(page, true);
  await page.goto("/conversation");
  await page.getByRole("button", { name: "Dictate a message" }).click();
  await expect(page.locator(".composer-area").getByRole("alert")).toContainText(
    "Microphone access was denied",
  );
  await expect(
    page.getByRole("textbox", { name: "Your message", exact: true }),
  ).toBeEnabled();
});

test("provider failure preserves the existing draft", async ({ page }) => {
  await mockMicrophone(page);
  await page.route("**/api/transcribe", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "Speech-to-text is temporarily unavailable." },
    }),
  );
  await page.goto("/conversation");
  const message = page.getByRole("textbox", {
    name: "Your message",
    exact: true,
  });
  await message.fill("Keep this draft");
  await record(page);
  await expect(page.locator(".composer-area").getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(message).toHaveValue("Keep this draft");
  await expect(message).toBeEnabled();
});

test("recording stops at one minute and opening a dialog releases the microphone", async ({
  page,
}) => {
  await mockMicrophone(page);
  await page.clock.install();
  let requests = 0;
  await page.route("**/api/transcribe", (route) => {
    requests++;
    return route.fulfill({ json: { text: "A short answer" } });
  });
  await page.goto("/conversation?mode=text");
  await page.getByRole("button", { name: "Dictate a message" }).click();
  await expect(page.getByRole("status")).toContainText("Recording");
  await page.clock.fastForward(60_000);
  await expect(
    page.getByRole("textbox", { name: "Your message", exact: true }),
  ).toHaveValue("A short answer");
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Dictate a message" }).click();
  await expect(page.getByRole("status")).toContainText("Recording");
  await page
    .getByRole("button", { name: "Review & fill in my numbers" })
    .click();
  await page.getByRole("button", { name: "Close profile editor" }).click();
  await expect(page.locator(".dictation-status")).toHaveCount(0);
  expect(requests).toBe(1);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { microphoneTest: { stopped: number } })
          .microphoneTest.stopped,
    ),
  ).toBe(2);
});
