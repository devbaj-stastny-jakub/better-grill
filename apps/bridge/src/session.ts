import type {
  AnswerRequest,
  ChatRequest,
  ClaudeStatus,
  GrillEvent,
  Option,
  Question,
  QuestionPatch,
  QuestionRef,
  ResolveInput,
  RoundInput,
  RoundPosted,
  SessionMode,
  SessionState,
} from "@better-grill/protocol";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OPTION_IDS = "abcdefgh";

type QuestionInput = RoundInput["questions"][number];

export type Session = ReturnType<typeof createSession>;

/**
 * In-memory state of one grill session plus the queue of events Claude has not read yet.
 * `imagePaths` turns attached image ids into the files Claude reads, and throws on unknown ids.
 */
export function createSession(title: string, mode: SessionMode, imagePaths: (ids: string[]) => string[]) {
  const state: SessionState = {
    title,
    mode,
    startedAt: Date.now(),
    rounds: [],
    questions: {},
    claude: "working",
    ended: false,
  };
  let events: GrillEvent[] = [];
  /** Questions whose answer Claude has received at least once. */
  const delivered = new Set<string>();
  let questionCount = 0;
  let messageCount = 0;
  const listeners = new Set<() => void>();

  function changed() {
    for (const listener of listeners) listener();
  }

  function find(id: string): Question {
    const question = state.questions[id];
    if (!question) throw new HttpError(404, `Unknown question ${id}`);
    return question;
  }

  function findLive(id: string): Question {
    const question = find(id);
    if (question.status === "dropped") throw new HttpError(409, `${id} was dropped`);
    return question;
  }

  function assertLive() {
    if (state.ended) throw new HttpError(409, "Session has ended");
  }

  function openQuestions(): QuestionRef[] {
    return Object.values(state.questions)
      .filter((q) => q.status === "open")
      .map((q) => ({ id: q.id, title: q.title }));
  }

  function unsent(): Question[] {
    return Object.values(state.questions).filter((q) => q.status === "answered" && !q.answer?.sent);
  }

  function toOptions(inputs: QuestionInput["options"]): Option[] {
    return inputs.map((option, i) => ({ id: OPTION_IDS[i]!, ...option }));
  }

  function createQuestion(q: QuestionInput, round: number): string {
    const id = `Q${++questionCount}`;
    const options = toOptions(q.options);
    state.questions[id] = {
      id,
      round,
      title: q.title,
      body: q.body,
      options,
      recommended: q.recommended === undefined ? undefined : options[q.recommended]?.id,
      recommendation: q.recommendation,
      multiSelect: q.multiSelect,
      status: "open",
      chat: [],
    };
    return id;
  }

  function refs(ids: string[]): QuestionRef[] {
    return ids.map((id) => ({ id, title: find(id).title }));
  }

  /** Shared by user answers and Claude resolutions. Only the user attaches images. */
  function setAnswer(
    question: Question,
    optionIds: string[],
    rawText: string | undefined,
    by: "user" | "claude",
    images: string[] = [],
  ) {
    for (const optionId of optionIds) {
      if (!question.options.some((o) => o.id === optionId)) {
        throw new HttpError(400, `Unknown option ${optionId} on ${question.id}`);
      }
    }
    if (!question.multiSelect && optionIds.length > 1) throw new HttpError(400, `${question.id} takes one option`);
    const text = rawText?.trim() || undefined;
    if (optionIds.length === 0 && !text && images.length === 0) {
      throw new HttpError(400, "Pick an option, write an answer or attach an image");
    }
    imagePaths(images);
    question.answer = { optionIds, text, images: images.length > 0 ? images : undefined, at: Date.now(), sent: false, by };
    question.status = "answered";
  }

  /** Move every unsent answer into the event queue. */
  function flushAnswers() {
    for (const question of unsent()) {
      const answer = question.answer!;
      events.push({
        type: "answer",
        questionId: question.id,
        title: question.title,
        choices: question.options.filter((o) => answer.optionIds.includes(o.id)).map((o) => o.label),
        text: answer.text,
        images: answer.images && imagePaths(answer.images),
        revised: delivered.has(question.id),
        by: answer.by,
      });
      delivered.add(question.id);
      answer.sent = true;
    }
  }

  function addMessage(question: Question, role: "user" | "claude", text: string, images: string[] = []) {
    question.chat.push({
      id: `m${++messageCount}`,
      role,
      text,
      images: images.length > 0 ? images : undefined,
      at: Date.now(),
    });
  }

  return {
    state,

    onChange(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    // ---------- Claude side ----------

    addRound(input: RoundInput): RoundPosted {
      assertLive();
      const number = state.rounds.length + 1;
      const ids = input.questions.map((q) => createQuestion(q, number));
      state.rounds.push({ number, title: input.title, questionIds: ids, at: Date.now() });
      state.awaitingSince = undefined;
      changed();
      return { round: number, questions: refs(ids) };
    },

    /** Append to the latest round, as long as the user has not sent it yet. */
    addQuestions(questions: QuestionInput[]): RoundPosted {
      assertLive();
      const round = state.rounds.at(-1);
      if (!round) throw new HttpError(409, "No round yet. Post one with `grill round`.");
      const live = round.questionIds.map(find).filter((q) => q.status !== "dropped");
      if (live.length > 0 && live.every((q) => q.answer?.sent)) {
        throw new HttpError(409, `Round ${round.number} was already sent. Post a new round with \`grill round\`.`);
      }
      const ids = questions.map((q) => createQuestion(q, round.number));
      round.questionIds.push(...ids);
      changed();
      return { round: round.number, questions: refs(ids) };
    },

    edit(id: string, patch: QuestionPatch) {
      assertLive();
      const question = findLive(id);
      if (patch.title !== undefined) question.title = patch.title;
      if (patch.body !== undefined) question.body = patch.body;
      if (patch.multiSelect !== undefined) question.multiSelect = patch.multiSelect;
      if (patch.recommendation !== undefined) question.recommendation = patch.recommendation ?? undefined;
      if (patch.options !== undefined) {
        question.options = toOptions(patch.options);
        // The old answer may point at options that no longer exist.
        if (question.status === "answered") {
          question.status = "open";
          question.answer = undefined;
        }
        if (patch.recommended === undefined) question.recommended = undefined;
      }
      if (patch.recommended !== undefined) {
        if (patch.recommended === null) {
          question.recommended = undefined;
        } else {
          const option = question.options[patch.recommended];
          if (!option) throw new HttpError(400, "recommended must be an index into options");
          question.recommended = option.id;
        }
      }
      if (!question.multiSelect && (question.answer?.optionIds.length ?? 0) > 1) {
        question.status = "open";
        question.answer = undefined;
      }
      question.editedAt = Date.now();
      changed();
    },

    /** Claude settles a question from its discussion. The user can still change it before Send. */
    resolve(id: string, input: ResolveInput) {
      assertLive();
      const question = findLive(id);
      const optionIds = input.options.map((index) => {
        const option = question.options[index];
        if (!option) throw new HttpError(400, `${id} has no option at index ${index}`);
        return option.id;
      });
      setAnswer(question, optionIds, input.text, "claude");
      changed();
    },

    reply(id: string, text: string) {
      addMessage(find(id), "claude", text);
      changed();
    },

    drop(id: string, reason: string) {
      const question = find(id);
      question.status = "dropped";
      question.dropReason = reason;
      question.answer = undefined;
      changed();
    },

    setSummary(markdown: string) {
      assertLive();
      state.summary = { markdown, status: "pending" };
      state.awaitingSince = undefined;
      changed();
    },

    setClaude(status: ClaudeStatus) {
      if (state.claude === status) return;
      state.claude = status;
      changed();
    },

    hasEvents() {
      return events.length > 0;
    },

    takeEvents(): GrillEvent[] {
      const taken = events;
      events = [];
      return taken;
    },

    openQuestions,

    /** Bridge shutdown: no event, Claude asked for it. */
    close() {
      state.ended = true;
      state.awaitingSince = undefined;
      changed();
    },

    // ---------- Browser side ----------

    answer(id: string, request: AnswerRequest) {
      assertLive();
      setAnswer(findLive(id), request.optionIds ?? [], request.text, "user", request.images);
      changed();
    },

    /** The user's Send button: everything answered goes to Claude as one round. */
    send() {
      assertLive();
      const open = openQuestions();
      if (open.length > 0) throw new HttpError(409, `Still open: ${open.map((q) => q.id).join(", ")}`);
      if (unsent().length === 0) throw new HttpError(409, "Nothing new to send");
      flushAnswers();
      state.awaitingSince = Date.now();
      changed();
    },

    chat(id: string, { text = "", images = [] }: ChatRequest) {
      assertLive();
      const question = find(id);
      const paths = imagePaths(images);
      addMessage(question, "user", text, images);
      events.push({ type: "chat", questionId: id, title: question.title, text, images: paths.length > 0 ? paths : undefined });
      changed();
    },

    respondSummary(confirmed: boolean, text?: string) {
      assertLive();
      if (!state.summary) throw new HttpError(409, "No summary to respond to");
      state.summary.status = confirmed ? "confirmed" : "rejected";
      state.summary.feedback = text || undefined;
      events.push(confirmed ? { type: "summary_confirmed" } : { type: "summary_rejected", text: text || undefined });
      changed();
    },

    end() {
      if (state.ended) return;
      state.ended = true;
      state.awaitingSince = undefined;
      // Claude still gets whatever was locked in before the user walked away.
      flushAnswers();
      events.push({ type: "ended" });
      changed();
    },
  };
}
