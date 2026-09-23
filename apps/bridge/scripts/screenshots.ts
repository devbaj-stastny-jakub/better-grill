/*
 * README screenshots: starts a bridge from the build in skills/better-grill/dist,
 * posts the demo rounds and photographs the UI in dark mode into .github/assets.
 * Run `pnpm screenshots` from the repo root (it builds first).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import type { WaitResponse } from "@better-grill/protocol";
import { call, parseHandle } from "../src/client.ts";
import { rounds } from "./demo-rounds.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const cli = join(root, "skills/better-grill/dist/cli.js");
const outDir = join(root, ".github/assets");

const grill = (...args: string[]) => execFileSync(process.execPath, [cli, ...args], { encoding: "utf8" });

const { session, url } = JSON.parse(grill("start", "--no-open", "--title", "Launch plan")) as { session: string; url: string };
const bridge = parseHandle(session)!;
// Keep a wait open like a real Claude session, so the UI shows it is waiting for you.
const wait = () => call<WaitResponse>(bridge, "GET", "/api/wait");

/** No focus rings or hover states in the shot, and animations done. */
async function settle(page: Page) {
  // Strings, not functions: the bridge tsconfig has no DOM types.
  await page.evaluate("document.activeElement?.blur()");
  await page.mouse.move(1100, 28);
  await page.waitForTimeout(600);
}

const browser = await chromium.launch();
try {
  await call(bridge, "POST", "/api/rounds", rounds[0]);
  let pending = wait();

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await page.goto(url);
  await page.getByText("Who is the first user?").first().waitFor();

  // Mid-round: first question locked in, second one picked, the rest still open.
  await page.getByRole("radio", { name: /Solo developers/ }).click();
  await page.keyboard.press("ControlOrMeta+Enter");
  await page.getByRole("radio", { name: /JSON file per session/ }).click();
  await settle(page);
  await page.evaluate("window.scrollTo(0, 0)");
  mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: join(outDir, "round.png") });

  // A discussion thread on the second question.
  await page.getByRole("button", { name: "Discuss" }).nth(1).click();
  const input = page.getByPlaceholder("Ask about this question…");
  await input.fill("Won't JSON files get messy once I run a few sessions at the same time?");
  await input.press("Enter");
  const { events } = await pending;
  const chat = events.find((event) => event.type === "chat");
  if (!chat || chat.type !== "chat") throw new Error(`Expected a chat event, got ${JSON.stringify(events)}`);
  await call(bridge, "POST", `/api/questions/${chat.questionId}/reply`, {
    text: [
      "Not really: one file per session, named by its id, so two sessions never write the same file.",
      "",
      "Where it starts to hurt is **searching across old sessions**. That's the point where SQLite pays for itself, and moving from JSON files later is a small migration.",
      "",
      "Keep JSON for now and note SQLite as a later step?",
    ].join("\n"),
  });
  pending = wait();
  pending.catch(() => {}); // stopping the bridge ends it
  await page.getByText("Where it starts to hurt").waitFor();
  await settle(page);
  await page.screenshot({ path: join(outDir, "discussion.png") });

  console.log(`Saved round.png and discussion.png to ${outDir}`);
} finally {
  await browser.close();
  grill("stop", "-s", session);
}
