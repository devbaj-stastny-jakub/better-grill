import { z } from "zod";
import { IMAGE_TYPES, type ImageType, MAX_IMAGES } from "./images.ts";

export * from "./images.ts";

/*
 * Wire contract between Claude (via the bridge CLI), the bridge and the web UI.
 *
 * Claude → bridge: RoundInput, added questions, question patch, resolution,
 *                  reply text, drop reason, summary markdown, visualization page.
 * Browser → bridge: ImageUpload, AnswerRequest, ChatRequest, VisualizeRequest, send, SummaryResponse.
 * Bridge → browser: SessionState snapshots over SSE.
 * Bridge → Claude: WaitResponse (queued GrillEvents) from the long-poll.
 *
 * Several bridges can run at once, one per Claude session. Every Claude-side call
 * carries the bridge's session id in SESSION_HEADER, so a call aimed at the wrong
 * port is refused instead of landing in someone else's grill.
 */

// ---------- Session guard ----------

/** Header carrying the session id on every Claude → bridge call. */
export const SESSION_HEADER = "x-grill-session";

/** GET /api/health. Unguarded: `grill start` and `grill stop` poll it. */
export type Health = { ok: true; title: string; pid: number; session: string };

// ---------- Claude → bridge ----------

export const OptionInputSchema = z.object({
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

const QuestionFields = z.object({
  title: z.string().trim().min(1),
  body: z.string().default(""),
  options: z.array(OptionInputSchema).max(8).default([]),
  /** Index into `options` of Claude's recommended pick. */
  recommended: z.number().int().min(0).optional(),
  /** Markdown: Claude's recommended answer and why. */
  recommendation: z.string().optional(),
  multiSelect: z.boolean().default(false),
});

export const QuestionInputSchema = QuestionFields.refine(
  (q) => q.recommended === undefined || q.recommended < q.options.length,
  { message: "recommended must be an index into options", path: ["recommended"] },
);

export const RoundInputSchema = z.object({
  title: z.string().trim().optional(),
  questions: z.array(QuestionInputSchema).min(1),
});

export type RoundInput = z.output<typeof RoundInputSchema>;

/** Questions Claude adds to the latest round while it is still unsent. */
export const AddQuestionsSchema = z.object({ questions: z.array(QuestionInputSchema).min(1) });

/**
 * Claude rewrites a question. Omitted fields stay. `null` clears recommended /
 * recommendation. Passing `options` clears any answer, since it may point at old options.
 */
export const QuestionPatchSchema = z
  .object({
    title: z.string().trim().min(1),
    body: z.string(),
    options: z.array(OptionInputSchema).max(8),
    recommended: z.number().int().min(0).nullable(),
    recommendation: z.string().nullable(),
    multiSelect: z.boolean(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: "Patch changes nothing" });

export type QuestionPatch = z.output<typeof QuestionPatchSchema>;

/** Claude settles a question from its discussion: option indexes, custom text, or both. */
export const ResolveInputSchema = z
  .object({
    options: z.array(z.number().int().min(0)).default([]),
    text: z.string().trim().optional(),
  })
  .refine((r) => r.options.length > 0 || !!r.text, { message: "Give options, text, or both" });

export type ResolveInput = z.output<typeof ResolveInputSchema>;

export const TextSchema = z.object({ text: z.string().trim().min(1) });

export const SummaryInputSchema = z.object({ markdown: z.string().trim().min(1) });

/** Longest visualization page Claude may post, in characters of HTML. */
export const MAX_VISUALIZATION_CHARS = 1_000_000;

/**
 * A visualization page for one question: an HTML fragment the UI wraps in its own
 * skeleton (theme tokens, fonts, CSP) and shows in a sandboxed frame.
 * How Claude builds it: skills/better-grill-base/visualize.md.
 */
export const VisualizationInputSchema = z.object({
  html: z
    .string()
    .trim()
    .min(1)
    .max(MAX_VISUALIZATION_CHARS, `Page is over ${MAX_VISUALIZATION_CHARS.toLocaleString("en")} characters. Simplify it.`),
});

// ---------- Browser → bridge ----------

/**
 * POST /api/images: a pasted or dropped image, base64 in JSON so the upload keeps
 * the JSON-only guard every browser route has. The bridge saves it and answers
 * ImageUploaded; answers and chat messages then refer to it by id.
 */
export const ImageUploadSchema = z.object({
  type: z.enum(Object.keys(IMAGE_TYPES) as [ImageType, ...ImageType[]]),
  data: z.string().min(1),
});

export type ImageUpload = z.input<typeof ImageUploadSchema>;

export type ImageUploaded = { id: string };

const ImageIdsSchema = z.array(z.string().regex(/^img\d+$/)).max(MAX_IMAGES).default([]);

export const AnswerRequestSchema = z.object({
  optionIds: z.array(z.string()).default([]),
  text: z.string().trim().optional(),
  images: ImageIdsSchema,
});

export type AnswerRequest = z.input<typeof AnswerRequestSchema>;

export const ChatRequestSchema = z
  .object({ text: z.string().trim().default(""), images: ImageIdsSchema })
  .refine((r) => r.text.length > 0 || r.images.length > 0, { message: "Write a message or attach an image" });

export type ChatRequest = z.input<typeof ChatRequestSchema>;

/** The Visualize button: ask Claude to visualize a question, optionally saying what to focus on. */
export const VisualizeRequestSchema = z.object({ note: z.string().trim().max(2000).optional() });

export type VisualizeRequest = z.input<typeof VisualizeRequestSchema>;

export const SummaryResponseSchema = z.object({
  confirmed: z.boolean(),
  text: z.string().trim().optional(),
});

// ---------- Session state (bridge → browser) ----------

export type Option = { id: string; label: string; description?: string };

/**
 * `images`: ids of images the user attached, served at /api/images/<id>. The text marks
 * where each one sits with `[Image N]`, N counting from 1 into `images`.
 */
export type ChatMessage = { id: string; role: "user" | "claude"; text: string; images?: string[]; at: number };

/**
 * `sent`: Claude has received this answer. Answers stay in the bridge until the
 * user presses Send, which needs every question answered.
 * `by`: "claude" when Claude resolved it from the discussion; the user can still change it.
 * `images`: ids of images the user attached, served at /api/images/<id>; `[Image N]` in the text is images[N-1].
 */
export type Answer = {
  optionIds: string[];
  text?: string;
  images?: string[];
  at: number;
  sent: boolean;
  by: "user" | "claude";
};

export type QuestionStatus = "open" | "answered" | "dropped";

/**
 * A question's visualization. `pending`: the user asked, Claude is working on it (a page from an
 * earlier request may still be there). `ready`: the latest page arrived. `failed`: Claude
 * said why there's nothing useful to visualize.
 * The page itself is not in the state: GET /api/questions/<id>/visualization serves it.
 */
export type Visualization = {
  status: "pending" | "ready" | "failed";
  /** What the user asked the latest request to show. */
  note?: string;
  requestedAt: number;
  /** Bumps with every page Claude posts. 0 until the first one. */
  version: number;
  /** When the current page arrived. Before the question's `editedAt`: made before Claude's last edit. */
  readyAt?: number;
  /** Why there's no visualization, when `failed`. */
  reason?: string;
};

/** GET /api/questions/<id>/visualization. */
export type VisualizationPage = { version: number; html: string };

export type Question = {
  id: string;
  round: number;
  title: string;
  body: string;
  options: Option[];
  recommended?: string;
  recommendation?: string;
  multiSelect: boolean;
  status: QuestionStatus;
  answer?: Answer;
  dropReason?: string;
  /** Last time Claude rewrote the question. */
  editedAt?: number;
  chat: ChatMessage[];
  visualization?: Visualization;
};

export type Round = { number: number; title?: string; questionIds: string[]; at: number };

export type Summary = {
  markdown: string;
  status: "pending" | "confirmed" | "rejected";
  feedback?: string;
};

/**
 * "plain": grill only (grill-me). "docs": Claude also records the glossary (CONTEXT.md)
 * and ADRs as decisions settle (grill-with-docs). Set by `grill start --docs`.
 */
export type SessionMode = "plain" | "docs";

/** "listening": Claude has a wait open. "working": Claude is busy with the last events. */
export type ClaudeStatus = "listening" | "working";

export type SessionState = {
  title: string;
  mode: SessionMode;
  startedAt: number;
  rounds: Round[];
  questions: Record<string, Question>;
  claude: ClaudeStatus;
  summary?: Summary;
  /** Set when the user pressed Send; cleared when Claude posts the next round or the summary. */
  awaitingSince?: number;
  ended: boolean;
};

// ---------- Events (bridge → Claude) ----------

export type GrillEvent =
  | {
      type: "answer";
      questionId: string;
      title: string;
      /** Labels of the picked options. */
      choices: string[];
      /** Free text the user typed: own answer, or a note on the picked option. */
      text?: string;
      /** Absolute paths of images the user attached; `[Image N]` in the text is images[N-1]. Read them to see them. */
      images?: string[];
      /** True when the user changed an answer Claude had already received. */
      revised: boolean;
      /** "claude": your own resolution, sent back unchanged by the user. */
      by: "user" | "claude";
    }
  | { type: "chat"; questionId: string; title: string; text: string; images?: string[] }
  /** The user pressed Visualize. `note`: what they want the picture to show. */
  | { type: "visualize"; questionId: string; title: string; note?: string }
  | { type: "summary_confirmed" }
  | { type: "summary_rejected"; text?: string }
  | { type: "ended" };

export type QuestionRef = { id: string; title: string };

export type WaitResponse = {
  events: GrillEvent[];
  /** Questions still waiting for an answer, after these events. */
  open: QuestionRef[];
  /** Another wait took over this one. */
  superseded?: true;
  /** Bridge is shutting down. */
  shutdown?: true;
};

export type RoundPosted = { round: number; questions: QuestionRef[] };
