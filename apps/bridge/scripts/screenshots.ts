/*
 * README screenshots: starts a bridge from the build in skills/better-grill-base/dist,
 * posts the demo rounds and photographs the UI in dark mode into .github/assets,
 * then frames the discussion shot in the hero (scripts/hero.html). Every image gets
 * rounded corners on a transparent background, so it sits nicely on any README theme.
 * Run `pnpm screenshots` from the repo root (it builds first).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import type { WaitResponse } from "@better-grill/protocol";
import { call, parseHandle } from "../src/client.ts";
import { rounds } from "./demo-rounds.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const cli = join(root, "skills/better-grill-base/dist/cli.js");
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

/** Rounded corners, cut to transparency: re-shoots the PNG as an image with border-radius over nothing. */
async function roundCorners(file: string, radius: number) {
  const png = readFileSync(file);
  // PNG header: width and height are big-endian at bytes 16 and 20. Shots are 2x.
  const width = png.readUInt32BE(16) / 2;
  const height = png.readUInt32BE(20) / 2;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.setContent(
    `<body style="margin:0;background:transparent"><img src="data:image/png;base64,${png.toString("base64")}" style="display:block;width:${width}px;height:${height}px;border-radius:${radius}px"></body>`,
  );
  await page.locator("img").evaluate((img: { decode(): Promise<void> }) => img.decode());
  await page.screenshot({ path: file, omitBackground: true });
  await page.close();
}

const browser = await chromium.launch();
try {
  await call(bridge, "POST", "/api/rounds", rounds[0]);
  let pending = wait();

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await page.goto(url);
  await page.getByText("Who is the first user?").first().waitFor();

  // Mid-round: first question locked in (the page steps on to the second), second one picked.
  await page.getByRole("radio", { name: /Solo developers/ }).click();
  await page.keyboard.press("ControlOrMeta+Enter");
  await page.getByRole("radio", { name: /JSON file per session/ }).click();
  mkdirSync(outDir, { recursive: true });

  // A discussion thread on the second question.
  await page.getByRole("button", { name: "Discuss" }).first().click();
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

  // Hero: the discussion shot in a floating window next to the pitch.
  const hero = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 });
  const heroUrl = new URL("./hero.html", import.meta.url);
  heroUrl.searchParams.set("shot", pathToFileURL(join(outDir, "discussion.png")).href);
  await hero.goto(heroUrl.href);
  await hero.waitForSelector("body[data-ready]", { state: "attached" });
  await hero.evaluate("document.fonts.ready");
  await hero.screenshot({ path: join(outDir, "hero.png") });
  // After the hero has used the square discussion shot.
  await roundCorners(join(outDir, "discussion.png"), 16);
  await roundCorners(join(outDir, "hero.png"), 24);

  console.log(`Saved discussion.png and hero.png to ${outDir}`);
} finally {
  await browser.close();
  grill("stop", "-s", session);
}
