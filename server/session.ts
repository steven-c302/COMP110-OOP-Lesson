// Live session state machine: players, quiz phases, scoring, code results,
// fighter submissions, and tournament bookkeeping. Pure logic with an
// injectable clock so it can be unit tested.
import { randomUUID } from "node:crypto";
import type {
  AdminView,
  CodeStats,
  CodeStep,
  LeaderRow,
  PlayerRow,
  PublicStep,
  QuizPhase,
  QuizState,
  QuizStep,
  Step,
  StudentTournament,
  StudentView,
  SubmissionCard,
  TournamentEntry,
  TournamentResult,
  TournamentStatus,
} from "../shared/types.ts";
import { SCORING } from "../shared/types.ts";
import { defaultFighterCode } from "./defaults.ts";

/** How long the room sees the vote split before the answer auto-reveals. */
export const RESULTS_HOLD_MS = 6000;

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout),
};

interface QuizAnswer {
  choice: number;
  at: number;
}

interface QuizRecord {
  r1?: QuizAnswer;
  r2?: QuizAnswer;
  scored?: boolean;
  correct?: boolean | null;
  points?: number;
  streakBonus?: number;
}

interface TaskRecord {
  passed: number;
  total: number;
  points: number;
  code: string;
  tests: { name: string; passed: boolean }[];
}

export interface Player {
  id: string;
  token: string;
  name: string;
  score: number;
  connected: boolean;
  streak: number;
  bestStreak: number;
  quiz: Record<string, QuizRecord>;
  tasks: Record<string, TaskRecord>;
  fighter?: { code: string; card: SubmissionCard; at: number };
  lastCheer?: number;
}

interface QuizRuntime {
  stepId: string;
  phase: QuizPhase;
  round: 1 | 2;
  hadRevote: boolean;
  openedAt: number;
  r1OpenedAt: number;
  endsAt: number;
}

interface TournamentRuntime {
  status: TournamentStatus;
  entries: TournamentEntry[];
  result: TournamentResult | null;
  revealed: number;
  currentMatch: { a: string; b: string } | null;
  cheers: [number, number];
  awarded: boolean;
}

export interface Settings {
  speedBonus: boolean;
  lateJoin: boolean;
  reducedMotion: boolean;
  muted: boolean;
  theme: "dark" | "light";
}

const BLOCKED_WORDS = [
  "fuck", "shit", "bitch", "cunt", "dick", "cock", "pussy", "nigg", "fag", "slut", "whore",
  "rape", "nazi", "hitler", "penis", "vagina", "porn", "sex", "ass", "retard", "kys",
];

export function cleanName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 18) return { ok: false, error: "Nicknames are 2–18 characters." };
  const squashed = name
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[^a-z]/g, "");
  if (BLOCKED_WORDS.some((w) => squashed.includes(w) && !(w === "ass" && /(class|pass|bass|mass|grass|assassin)/.test(squashed)))) {
    return { ok: false, error: "Let's pick a different nickname." };
  }
  return { ok: true, name };
}

export interface SessionSnapshot {
  stepIndex: number;
  players: Player[];
  quiz: QuizRuntime | null;
  settings: Settings;
  submissionsLocked: boolean;
  prevRanks: Record<string, number>;
  codeStart: Record<string, number>;
  recentPasses: Record<string, string[]>;
  tournament: TournamentRuntime;
  savedAt: number;
}

export class Session {
  stepIndex = 0;
  players = new Map<string, Player>();
  quiz: QuizRuntime | null = null;
  settings: Settings = { speedBonus: true, lateJoin: true, reducedMotion: false, muted: false, theme: "dark" };
  submissionsLocked = false;
  prevRanks: Record<string, number> = {};
  codeStart: Record<string, number> = {};
  recentPasses: Record<string, string[]> = {};
  tournament: TournamentRuntime = Session.freshTournament();
  joinUrl = "";
  private timer: unknown = null;

  constructor(
    public steps: Step[],
    private clock: Clock = realClock,
    private onChange: (scope: "all" | "admin") => void = () => {},
  ) {
    this.enterStep();
  }

  static freshTournament(): TournamentRuntime {
    return { status: "idle", entries: [], result: null, revealed: 0, currentMatch: null, cheers: [0, 0], awarded: false };
  }

  get step(): Step {
    return this.steps[this.stepIndex];
  }

  // ------------------------------------------------------------ players
  join(rawName: unknown, token?: string): { ok: true; player: Player } | { ok: false; error: string } {
    if (token) {
      const existing = [...this.players.values()].find((p) => p.token === token);
      if (existing) {
        existing.connected = true;
        this.changed();
        return { ok: true, player: existing };
      }
    }
    if (!this.settings.lateJoin && this.stepIndex > 0) return { ok: false, error: "The game has already started." };
    const cleaned = cleanName(rawName);
    if (!cleaned.ok) return cleaned;
    const taken = [...this.players.values()].some((p) => p.name.toLowerCase() === cleaned.name.toLowerCase());
    if (taken) return { ok: false, error: "That nickname is taken. Try another!" };
    const player: Player = {
      id: randomUUID().slice(0, 8),
      token: randomUUID(),
      name: cleaned.name,
      score: 0,
      connected: true,
      streak: 0,
      bestStreak: 0,
      quiz: {},
      tasks: {},
    };
    this.players.set(player.id, player);
    this.changed();
    return { ok: true, player };
  }

  setConnected(playerId: string, connected: boolean) {
    const p = this.players.get(playerId);
    if (p && p.connected !== connected) {
      p.connected = connected;
      this.maybeAutoClose();
      this.changed();
    }
  }

  kick(playerId: string) {
    this.players.delete(playerId);
    this.changed();
  }

  rename(playerId: string, raw: string): string | null {
    const p = this.players.get(playerId);
    if (!p) return "No such player";
    const cleaned = cleanName(raw);
    if (!cleaned.ok) return cleaned.error;
    p.name = cleaned.name;
    this.changed();
    return null;
  }

  // ------------------------------------------------------------ navigation
  goto(index: number) {
    if (index < 0 || index >= this.steps.length || index === this.stepIndex) return;
    this.leaveStep();
    this.stepIndex = index;
    this.enterStep();
    this.changed();
  }

  private leaveStep() {
    const step = this.step;
    this.clearTimer();
    if (step.type === "quiz" && this.quiz && this.quiz.phase !== "revealed") {
      this.scoreQuiz(step); // never lose points because the host skipped the reveal
    }
    if (step.type === "leaderboard") {
      for (const row of this.leaderboard()) this.prevRanks[row.id] = row.rank;
    }
    this.quiz = null;
  }

  private enterStep() {
    const step = this.step;
    if (step.type === "quiz") {
      const now = this.clock.now();
      const read = (step.readSeconds ?? 4) * 1000;
      this.quiz = { stepId: step.id, phase: "reading", round: 1, hadRevote: false, openedAt: now + read, r1OpenedAt: now + read, endsAt: now + read };
      this.schedule(read, () => this.openRound());
    }
    if (step.type === "code" && !this.codeStart[step.id]) {
      this.codeStart[step.id] = this.clock.now();
    }
  }

  // ------------------------------------------------------------ quiz
  private currentQuizStep(): QuizStep | null {
    return this.step.type === "quiz" ? this.step : null;
  }

  private openRound() {
    const step = this.currentQuizStep();
    if (!step || !this.quiz) return;
    const now = this.clock.now();
    this.quiz.phase = this.quiz.round === 1 ? "open" : "revote";
    this.quiz.openedAt = now;
    if (this.quiz.round === 1) this.quiz.r1OpenedAt = now;
    this.quiz.endsAt = now + step.seconds * 1000;
    this.schedule(step.seconds * 1000, () => this.closeRound());
    this.changed();
  }

  /** Voting ends (timer or everyone answered): show everyone how the room voted,
   *  then reveal the answer automatically after a short beat (host can hold/discuss). */
  private closeRound() {
    if (!this.quiz || (this.quiz.phase !== "open" && this.quiz.phase !== "revote")) return;
    this.clearTimer();
    this.quiz.phase = "closed";
    this.quiz.endsAt = this.clock.now() + RESULTS_HOLD_MS;
    this.schedule(RESULTS_HOLD_MS, () => this.quizAction("reveal"));
    this.changed();
  }

  answer(playerId: string, stepId: string, choice: number): boolean {
    const step = this.currentQuizStep();
    const p = this.players.get(playerId);
    if (!step || !p || !this.quiz || step.id !== stepId) return false;
    if (this.quiz.phase !== "open" && this.quiz.phase !== "revote") return false;
    if (!Number.isInteger(choice) || choice < 0 || choice >= step.choices.length) return false;
    const rec = (p.quiz[step.id] ??= {});
    const key = this.quiz.round === 1 ? "r1" : "r2";
    if (rec[key]) return false;
    rec[key] = { choice, at: this.clock.now() };
    this.maybeAutoClose();
    this.changed();
    return true;
  }

  private eligible(): Player[] {
    return [...this.players.values()].filter((p) => p.connected);
  }

  private answeredCount(): number {
    if (!this.quiz) return 0;
    const key = this.quiz.round === 1 ? "r1" : "r2";
    return [...this.players.values()].filter((p) => p.quiz[this.quiz!.stepId]?.[key]).length;
  }

  private maybeAutoClose() {
    if (!this.quiz || (this.quiz.phase !== "open" && this.quiz.phase !== "revote")) return;
    const key = this.quiz.round === 1 ? "r1" : "r2";
    const waiting = this.eligible().filter((p) => !p.quiz[this.quiz!.stepId]?.[key]);
    if (waiting.length === 0 && this.eligible().length > 0) this.closeRound();
  }

  quizAction(action: "close" | "extend" | "hold" | "discuss" | "revote" | "reveal") {
    const step = this.currentQuizStep();
    const q = this.quiz;
    if (!step || !q) return;
    const now = this.clock.now();
    switch (action) {
      case "close":
        if (q.phase === "reading") {
          this.clearTimer();
          this.openRound();
        } else this.closeRound();
        break;
      case "extend":
        if (q.phase === "open" || q.phase === "revote" || q.phase === "discuss") {
          q.endsAt += 10_000;
          this.clearTimer();
          this.schedule(q.endsAt - now, () => (q.phase === "discuss" ? this.startRevote() : this.closeRound()));
        }
        break;
      case "hold":
        if (q.phase === "closed") {
          this.clearTimer();
          q.endsAt = 0;
        }
        break;
      case "discuss":
        if (q.phase === "closed" && q.round === 1 && step.kind !== "poll") {
          this.clearTimer();
          q.phase = "discuss";
          q.hadRevote = true;
          q.endsAt = now + 60_000;
          this.schedule(60_000, () => this.startRevote());
        }
        break;
      case "revote":
        if (q.phase === "discuss") this.startRevote();
        break;
      case "reveal":
        if (q.phase === "closed" || q.phase === "discuss") {
          this.clearTimer();
          this.scoreQuiz(step);
          q.phase = "revealed";
          q.endsAt = 0;
        }
        break;
    }
    this.changed();
  }

  private startRevote() {
    if (!this.quiz || this.quiz.phase !== "discuss") return;
    this.clearTimer();
    this.quiz.round = 2;
    this.openRound();
  }

  /** Score round-1 answers once. Revotes are for learning and are never scored. */
  private scoreQuiz(step: QuizStep) {
    if (step.kind === "poll" || step.correct === undefined) return;
    const q = this.quiz;
    for (const p of this.players.values()) {
      const rec = (p.quiz[step.id] ??= {});
      if (rec.scored) continue;
      rec.scored = true;
      const a = rec.r1;
      if (!a) {
        if (p.connected) p.streak = 0;
        rec.correct = null;
        rec.points = 0;
        continue;
      }
      const correct = a.choice === step.correct;
      rec.correct = correct;
      if (!correct) {
        p.streak = 0;
        rec.points = 0;
        rec.streakBonus = 0;
        continue;
      }
      const opened = q && q.stepId === step.id ? q.r1OpenedAt : a.at;
      const windowMs = step.seconds * 1000;
      const frac = Math.max(0, Math.min(1, 1 - (a.at - opened) / windowMs));
      const speed = this.settings.speedBonus ? Math.round(SCORING.speedBonusMax * frac) : 0;
      p.streak += 1;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      const streakBonus = Math.min(SCORING.streakMax, SCORING.streakStep * (p.streak - 1));
      rec.points = SCORING.correct + speed + streakBonus;
      rec.streakBonus = streakBonus;
      p.score += rec.points;
    }
  }

  private counts(stepId: string, round: "r1" | "r2", n: number): number[] {
    const counts = new Array(n).fill(0);
    for (const p of this.players.values()) {
      const a = p.quiz[stepId]?.[round];
      if (a) counts[a.choice] += 1;
    }
    return counts;
  }

  private quizState(forAdmin: boolean): QuizState | null {
    const step = this.currentQuizStep();
    const q = this.quiz;
    if (!step || !q) return null;
    const revealed = q.phase === "revealed";
    // Vote counts go to everyone once voting closes (results first, answer second).
    // During a revote the first-round split stays visible, but the live revote split doesn't.
    const show1 = forAdmin || revealed || q.phase === "closed" || q.hadRevote;
    const show2 = q.hadRevote && (forAdmin || revealed || (q.phase === "closed" && q.round === 2));
    return {
      stepId: q.stepId,
      phase: q.phase,
      round: q.round,
      hadRevote: q.hadRevote,
      openedAt: q.openedAt,
      endsAt: q.endsAt,
      answered: this.answeredCount(),
      eligible: this.eligible().length,
      counts1: show1 ? this.counts(step.id, "r1", step.choices.length) : undefined,
      counts2: show2 ? this.counts(step.id, "r2", step.choices.length) : undefined,
      correct: forAdmin || revealed ? step.correct : undefined,
    };
  }

  // ------------------------------------------------------------ code tasks
  codeResult(playerId: string, stepId: string, data: { passed: number; total: number; code: string; tests: { name: string; passed: boolean }[] }) {
    const p = this.players.get(playerId);
    const idx = this.steps.findIndex((s) => s.id === stepId);
    const step = this.steps[idx];
    if (!p || !step || step.type !== "code" || idx > this.stepIndex) return;
    const total = Math.max(1, Math.min(50, Math.floor(Number(data.total) || 1)));
    const passed = Math.max(0, Math.min(total, Math.floor(Number(data.passed) || 0)));
    const tests = Array.isArray(data.tests)
      ? data.tests.slice(0, 50).map((t) => ({ name: String(t?.name ?? "").slice(0, 120), passed: !!t?.passed }))
      : [];
    const prev = p.tasks[step.taskId];
    const points = Math.round((SCORING.codeMax * passed) / total);
    const gained = Math.max(0, points - (prev?.points ?? 0));
    p.score += gained;
    p.tasks[step.taskId] = {
      passed: Math.max(passed, prev?.passed ?? 0),
      total,
      points: Math.max(points, prev?.points ?? 0),
      code: String(data.code ?? "").slice(0, 20_000),
      tests,
    };
    if (passed === total && (prev?.passed ?? 0) < total) {
      const list = (this.recentPasses[stepId] ??= []);
      list.unshift(p.name);
      list.length = Math.min(list.length, 12);
    }
    this.changed();
  }

  saveCode(playerId: string, taskId: string, code: string) {
    const p = this.players.get(playerId);
    if (!p) return;
    const rec = (p.tasks[taskId] ??= { passed: 0, total: 0, points: 0, code: "", tests: [] });
    rec.code = String(code ?? "").slice(0, 20_000);
  }

  private codeStats(): CodeStats | null {
    const step = this.step;
    if (step.type !== "code") return null;
    const perTest = new Map<string, { passed: number; attempted: number }>();
    let started = 0;
    let allPassed = 0;
    for (const p of this.players.values()) {
      const rec = p.tasks[step.taskId];
      if (!rec || rec.total === 0) continue;
      started += 1;
      if (rec.passed === rec.total) allPassed += 1;
      for (const t of rec.tests) {
        const row = perTest.get(t.name) ?? { passed: 0, attempted: 0 };
        row.attempted += 1;
        if (t.passed) row.passed += 1;
        perTest.set(t.name, row);
      }
    }
    return {
      stepId: step.id,
      startedAt: this.codeStart[step.id] ?? this.clock.now(),
      players: this.players.size,
      started,
      allPassed,
      perTest: [...perTest.entries()].map(([name, v]) => ({ name, ...v })),
      recentPasses: this.recentPasses[step.id] ?? [],
    };
  }

  // ------------------------------------------------------------ fighters
  submitFighter(playerId: string, code: string, card: Partial<SubmissionCard>): string | null {
    const p = this.players.get(playerId);
    if (!p) return "Not joined";
    if (this.submissionsLocked) return "Submissions are locked";
    const clean: SubmissionCard = {
      id: p.id,
      player: p.name,
      name: String(card.name ?? "Fighter").slice(0, 24),
      sprite: (["knight", "mage", "rogue", "golem", "slime", "dragon", "skeleton", "archer"].includes(String(card.sprite))
        ? card.sprite
        : "knight") as SubmissionCard["sprite"],
      cls: String(card.cls ?? "Fighter").slice(0, 32),
      cry: String(card.cry ?? "").slice(0, 80),
      maxHp: Number(card.maxHp) || 100,
      power: Number(card.power) || 10,
      defense: Number(card.defense) || 0,
      speed: Number(card.speed) || 5,
    };
    p.fighter = { code: String(code).slice(0, 20_000), card: clean, at: this.clock.now() };
    this.changed();
    return null;
  }

  setLocked(locked: boolean) {
    this.submissionsLocked = locked;
    this.changed();
  }

  // ------------------------------------------------------------ tournament
  startTournament(): TournamentEntry[] | null {
    if (this.step.type !== "tournament") return null;
    this.submissionsLocked = true;
    const entries: TournamentEntry[] = [];
    for (const p of this.players.values()) {
      if (p.fighter) entries.push({ id: p.id, player: p.name, code: p.fighter.code });
      else entries.push({ id: p.id, player: p.name, code: defaultFighterCode(p.name, p.id), isDefault: true });
    }
    this.tournament = { ...Session.freshTournament(), status: "computing", entries };
    this.changed();
    return entries;
  }

  tournamentResult(result: TournamentResult) {
    if (this.tournament.status !== "computing") return;
    this.tournament.result = result;
    this.tournament.status = "playing";
    this.tournament.revealed = 0;
    this.changed();
  }

  tournamentProgress(revealed: number, current: { a: string; b: string } | null) {
    if (this.tournament.status !== "playing") return;
    const changedMatch = JSON.stringify(current) !== JSON.stringify(this.tournament.currentMatch);
    this.tournament.revealed = Math.max(this.tournament.revealed, Math.floor(revealed) || 0);
    this.tournament.currentMatch = current;
    if (changedMatch) this.tournament.cheers = [0, 0];
    this.changed();
  }

  tournamentDone() {
    const t = this.tournament;
    if (t.status !== "playing" || !t.result || t.awarded) return;
    t.awarded = true;
    t.status = "done";
    t.currentMatch = null;
    t.revealed = t.result.rounds.reduce((n, r) => n + r.length, 0);
    for (const round of t.result.rounds) {
      for (const m of round) {
        if (m.battle && m.winner) {
          const p = this.players.get(m.winner);
          if (p) p.score += SCORING.tournamentWin;
        }
      }
    }
    const champ = t.result.champion && this.players.get(t.result.champion);
    if (champ) champ.score += SCORING.champion;
    this.changed();
  }

  resetTournament() {
    this.tournament = Session.freshTournament();
    this.changed();
  }

  cheer(playerId: string, side: 0 | 1) {
    const p = this.players.get(playerId);
    const now = this.clock.now();
    if (!p || !this.tournament.currentMatch || (side !== 0 && side !== 1)) return;
    if (p.lastCheer && now - p.lastCheer < 250) return;
    p.lastCheer = now;
    this.tournament.cheers[side] += 1;
    this.changed("admin");
  }

  // ------------------------------------------------------------ settings
  updateSettings(patch: Partial<Settings>) {
    for (const key of Object.keys(this.settings) as (keyof Settings)[]) {
      if (key in patch && typeof patch[key] === typeof this.settings[key]) {
        (this.settings as unknown as Record<string, unknown>)[key] = patch[key];
      }
    }
    this.changed();
  }

  reset() {
    this.clearTimer();
    this.players.clear();
    this.quiz = null;
    this.submissionsLocked = false;
    this.prevRanks = {};
    this.codeStart = {};
    this.recentPasses = {};
    this.tournament = Session.freshTournament();
    this.stepIndex = 0;
    this.enterStep();
    this.changed();
  }

  // ------------------------------------------------------------ leaderboards
  leaderboard(): LeaderRow[] {
    const sorted = [...this.players.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const rows: LeaderRow[] = [];
    sorted.forEach((p, i) => {
      const rank = i > 0 && sorted[i - 1].score === p.score ? rows[i - 1].rank : i + 1;
      rows.push({ id: p.id, name: p.name, score: p.score, rank, prevRank: this.prevRanks[p.id] });
    });
    return rows;
  }

  climbers(board = this.leaderboard()): LeaderRow[] {
    return board
      .filter((r) => r.prevRank !== undefined && r.prevRank - r.rank > 0)
      .sort((a, b) => b.prevRank! - b.rank - (a.prevRank! - a.rank))
      .slice(0, 3);
  }

  // ------------------------------------------------------------ views
  adminView(): AdminView {
    const board = this.leaderboard();
    const quizStep = this.currentQuizStep();
    const key = this.quiz?.round === 2 ? "r2" : "r1";
    const players: PlayerRow[] = [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      streak: p.streak,
      bestStreak: p.bestStreak,
      answered: !!(quizStep && p.quiz[quizStep.id]?.[key]),
      submitted: !!p.fighter,
      tasks: Object.fromEntries(Object.entries(p.tasks).map(([k, v]) => [k, { passed: v.passed, total: v.total }])),
    }));
    return {
      role: "admin",
      serverNow: this.clock.now(),
      stepIndex: this.stepIndex,
      steps: this.steps,
      quiz: this.quizState(true),
      players,
      leaderboard: board,
      climbers: this.climbers(board),
      code: this.codeStats(),
      submissions: [...this.players.values()]
        .filter((p) => p.fighter)
        .sort((a, b) => a.fighter!.at - b.fighter!.at)
        .map((p) => ({ ...p.fighter!.card, player: p.name })),
      submissionsLocked: this.submissionsLocked,
      tournament: this.tournamentSummary(),
      joinUrl: this.joinUrl,
      settings: this.settings,
    };
  }

  private tournamentSummary(): AdminView["tournament"] {
    const t = this.tournament;
    const r = t.result;
    const champ = r?.champion ? r.fighters.find((f) => f.id === r.champion) : null;
    return {
      status: t.status,
      revealed: t.revealed,
      cheers: t.cheers,
      totalMatches: r ? r.rounds.reduce((n, round) => n + round.length, 0) : 0,
      fighters: r ? r.fighters.length : 0,
      champion: t.status === "done" && champ ? `${champ.name} (${champ.player})` : null,
      disqualified: r ? r.disqualified.map((d) => ({ player: d.player, error: d.error })) : [],
      entries: t.entries.length,
    };
  }

  /** The current step with quiz answers removed. */
  private publicStep(): PublicStep {
    const step = this.step;
    if (step.type === "quiz") {
      const revealed = this.quiz?.phase === "revealed";
      const { correct, explain, speaker, ...rest } = step;
      return (revealed ? { ...rest, correct, explain } : rest) as PublicStep;
    }
    const { speaker, ...rest } = step; // TA notes never reach students
    return rest as PublicStep;
  }

  studentView(playerId: string): StudentView | null {
    const p = this.players.get(playerId);
    if (!p) return null;
    const board = this.leaderboard();
    const myIndex = board.findIndex((r) => r.id === p.id);
    const quizStep = this.currentQuizStep();
    const rec = quizStep ? p.quiz[quizStep.id] : undefined;
    const key = this.quiz?.round === 2 ? "r2" : "r1";
    const revealed = this.quiz?.phase === "revealed";
    const step = this.step;
    return {
      role: "student",
      serverNow: this.clock.now(),
      stepIndex: this.stepIndex,
      stepCount: this.steps.length,
      step: this.publicStep(),
      quiz: this.quizState(false),
      me: {
        id: p.id,
        name: p.name,
        score: p.score,
        rank: board[myIndex]?.rank ?? 0,
        of: board.length,
        streak: p.streak,
        bestStreak: p.bestStreak,
        answer: rec?.[key]?.choice ?? null,
        lastResult:
          revealed && rec?.scored ? { correct: rec.correct ?? null, points: rec.points ?? 0, streakBonus: rec.streakBonus ?? 0 } : null,
        neighbors: board.slice(Math.max(0, myIndex - 2), myIndex + 3),
        submitted: !!p.fighter,
        tasks: Object.fromEntries(Object.entries(p.tasks).map(([k, v]) => [k, { passed: v.passed, total: v.total }])),
      },
      submissionsLocked: this.submissionsLocked,
      carryCode: Object.fromEntries(Object.entries(p.tasks).map(([k, v]) => [k, v.code])),
      tournament: step.type === "tournament" || step.type === "podium" ? this.studentTournament(p) : null,
      podium: step.type === "podium" ? board.slice(0, 3) : null,
    };
  }

  private studentTournament(p: Player): StudentTournament {
    const t = this.tournament;
    const result = t.result;
    const myFighter = result?.fighters.find((f) => f.id === p.id) ?? null;
    const myMatches: StudentTournament["myMatches"] = [];
    let eliminated = false;
    if (result) {
      let flat = 0;
      result.rounds.forEach((round, r) => {
        for (const m of round) {
          const index = flat++;
          if (m.a !== p.id && m.b !== p.id) continue;
          if (index >= t.revealed) {
            myMatches.push({ round: r, opponent: null, won: null });
            continue;
          }
          const oppId = m.a === p.id ? m.b : m.a;
          const opp = oppId ? result.fighters.find((f) => f.id === oppId) : null;
          const won = m.winner === p.id;
          if (!won) eliminated = true;
          myMatches.push({ round: r, opponent: opp ? `${opp.name} (${opp.player})` : "BYE", won });
        }
      });
    }
    const champion = t.status === "done" && result?.champion ? result.fighters.find((f) => f.id === result.champion) : null;
    return {
      status: t.status,
      myFighter,
      myMatches,
      eliminated,
      champion: champion ? `${champion.name} (${champion.player})` : null,
      currentMatch: t.currentMatch,
    };
  }

  // ------------------------------------------------------------ persistence
  snapshot(): SessionSnapshot {
    return {
      stepIndex: this.stepIndex,
      players: [...this.players.values()],
      quiz: this.quiz,
      settings: this.settings,
      submissionsLocked: this.submissionsLocked,
      prevRanks: this.prevRanks,
      codeStart: this.codeStart,
      recentPasses: this.recentPasses,
      tournament: this.tournament,
      savedAt: this.clock.now(),
    };
  }

  restore(s: SessionSnapshot) {
    this.clearTimer();
    this.stepIndex = Math.min(s.stepIndex, this.steps.length - 1);
    this.players = new Map(s.players.map((p) => [p.id, { ...p, connected: false }]));
    this.settings = { ...this.settings, ...s.settings };
    this.submissionsLocked = s.submissionsLocked;
    this.prevRanks = s.prevRanks ?? {};
    this.codeStart = s.codeStart ?? {};
    this.recentPasses = s.recentPasses ?? {};
    this.tournament = s.tournament ?? Session.freshTournament();
    if (this.tournament.status === "computing") this.tournament = Session.freshTournament();
    this.quiz = null;
    if (this.step.type === "quiz") {
      this.quiz = s.quiz && s.quiz.stepId === this.step.id ? { ...s.quiz } : null;
      if (!this.quiz) this.enterStep();
      else if (["reading", "open", "revote", "discuss", "closed"].includes(this.quiz.phase)) {
        // after a restart the auto-reveal timer is gone: park on results until the host reveals
        this.quiz.phase = "closed";
        this.quiz.endsAt = 0;
      }
    }
  }

  // ------------------------------------------------------------ internals
  private schedule(ms: number, fn: () => void) {
    this.clearTimer();
    this.timer = this.clock.setTimeout(() => {
      this.timer = null;
      fn();
    }, Math.max(0, ms));
  }

  private clearTimer() {
    if (this.timer) this.clock.clearTimeout(this.timer);
    this.timer = null;
  }

  private changed(scope: "all" | "admin" = "all") {
    this.onChange(scope);
  }
}

export function stepOf<T extends Step["type"]>(steps: Step[], id: string, type: T) {
  return steps.find((s) => s.id === id && s.type === type) as Extract<Step, { type: T }> | undefined;
}

export type { CodeStep };
