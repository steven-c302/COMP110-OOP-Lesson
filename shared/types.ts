// Types shared by server and client.

export type PillarId = "encapsulation" | "abstraction" | "inheritance" | "polymorphism";
export type TaskId = PillarId;
export type SpriteId = "knight" | "mage" | "rogue" | "golem" | "slime" | "dragon" | "skeleton" | "archer";

interface StepBase {
  id: string;
  pillar?: PillarId;
  notes?: string; // speaker notes for the TA
  minutes?: number; // planned time, shown on the host run-sheet
}

export interface LobbyStep extends StepBase {
  type: "lobby";
}

export interface SlideStep extends StepBase {
  type: "slide";
  layout: "title" | "pillar" | "split" | "code" | "bullets" | "pillars";
  kicker?: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  code?: string;
}

export interface QuizStep extends StepBase {
  type: "quiz";
  kind: "choice" | "poll";
  prompt: string;
  code?: string;
  choices: string[];
  correct?: number; // index; absent for polls. Never sent to students before reveal.
  explain?: string;
  seconds: number;
  readSeconds?: number;
  label?: string; // e.g. "Predict the output", "Spot the bug"
}

export interface CodeStep extends StepBase {
  type: "code";
  pillar: PillarId;
  taskId: TaskId;
  title: string;
  goal: string;
  hints: string[];
  seconds: number;
  carryFrom?: TaskId; // start from the student's code for this earlier task
  submitFighter?: boolean;
}

export interface LeaderboardStep extends StepBase {
  type: "leaderboard";
  title?: string;
}

export interface TournamentStep extends StepBase {
  type: "tournament";
}

export interface PodiumStep extends StepBase {
  type: "podium";
}

export type Step = LobbyStep | SlideStep | QuizStep | CodeStep | LeaderboardStep | TournamentStep | PodiumStep;

/** What a student is allowed to see of a step (quiz answers stripped). */
export type PublicStep = Step;

// ---------------------------------------------------------------- quiz state
export type QuizPhase = "reading" | "open" | "closed" | "discuss" | "revote" | "revealed";

export interface QuizState {
  stepId: string;
  phase: QuizPhase;
  round: 1 | 2;
  hadRevote: boolean;
  openedAt: number; // server ms when answers unlocked
  endsAt: number; // server ms when current phase ends (0 = no timer)
  answered: number;
  eligible: number;
  // Only sent to host/screen while open; sent to everyone once revealed.
  counts1?: number[];
  counts2?: number[];
  correct?: number;
}

// ---------------------------------------------------------------- tournament
export interface FighterSummary {
  name: string;
  sprite: SpriteId;
  cls: string;
  maxHp: number;
  power: number;
  defense: number;
  speed: number;
}

export interface TurnLog {
  t: number;
  actor: 0 | 1;
  move: "strike" | "heavy" | "guard" | "heal" | "fumble";
  dmg: number;
  heal: number;
  hit: boolean;
  dodged: boolean;
  charged?: boolean;
  guarded?: boolean;
  error: string | null;
  hp: [number, number];
}

export interface BattleLog {
  fighters: [FighterSummary, FighterSummary];
  cries: [string, string];
  first: 0 | 1;
  turns: TurnLog[];
  winner: 0 | 1;
  reason: "ko" | "decision";
}

export interface TournamentFighter extends FighterSummary {
  id: string; // player id
  player: string; // nickname
  cry: string;
}

export interface TournamentMatch {
  a: string | null;
  b: string | null;
  winner: string | null;
  bye?: boolean;
  battle?: BattleLog;
}

export interface TournamentResult {
  fighters: TournamentFighter[];
  disqualified: { id: string; player: string; error: string }[];
  rounds: TournamentMatch[][];
  champion: string | null;
}

export interface TournamentEntry {
  id: string;
  player: string;
  code: string;
  isDefault?: boolean;
}

export type TournamentStatus = "idle" | "computing" | "playing" | "done";

// ---------------------------------------------------------------- players
export interface PlayerRow {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  streak: number;
  bestStreak: number;
  answered: boolean; // answered current quiz round
  submitted: boolean; // fighter submitted
  tasks: Record<string, { passed: number; total: number }>;
}

export interface LeaderRow {
  id: string;
  name: string;
  score: number;
  rank: number;
  prevRank?: number;
}

export interface CodeStats {
  stepId: string;
  startedAt: number; // server ms when the task first opened
  players: number;
  started: number;
  allPassed: number;
  perTest: { name: string; passed: number; attempted: number }[];
  recentPasses: string[]; // nicknames, newest first
}

export interface SubmissionCard extends FighterSummary {
  id: string;
  player: string;
  cry: string;
}

// ---------------------------------------------------------------- views
export interface AdminView {
  role: "admin";
  serverNow: number;
  stepIndex: number;
  steps: Step[];
  quiz: QuizState | null;
  players: PlayerRow[];
  leaderboard: LeaderRow[];
  climbers: LeaderRow[];
  code: CodeStats | null;
  submissions: SubmissionCard[];
  submissionsLocked: boolean;
  tournament: {
    status: TournamentStatus;
    revealed: number;
    cheers: [number, number];
    totalMatches: number;
    fighters: number;
    champion: string | null;
    disqualified: { player: string; error: string }[];
    entries: number;
  };
  joinUrl: string;
  settings: { speedBonus: boolean; lateJoin: boolean; reducedMotion: boolean; muted: boolean; theme: "dark" | "light" };
}

export interface StudentMe {
  id: string;
  name: string;
  score: number;
  rank: number;
  of: number;
  streak: number;
  bestStreak: number;
  answer: number | null; // their choice this quiz (current round)
  lastResult: { correct: boolean | null; points: number; streakBonus: number } | null;
  neighbors: LeaderRow[]; // relative leaderboard: me +/- 2
  submitted: boolean;
  tasks: Record<string, { passed: number; total: number }>;
}

export interface StudentTournament {
  status: TournamentStatus;
  myFighter: TournamentFighter | null;
  myMatches: { round: number; opponent: string | null; won: boolean | null }[];
  eliminated: boolean;
  champion: string | null;
  currentMatch: { a: string; b: string } | null;
}

export interface StudentView {
  role: "student";
  serverNow: number;
  stepIndex: number;
  stepCount: number;
  step: PublicStep;
  quiz: QuizState | null;
  me: StudentMe;
  submissionsLocked: boolean;
  carryCode: Record<string, string>;
  tournament: StudentTournament | null;
  podium: LeaderRow[] | null;
}

export const PILLARS: Record<PillarId, { name: string; color: string; glyph: string; tagline: string }> = {
  encapsulation: { name: "Encapsulation", color: "#4cc9f0", glyph: "🔒", tagline: "Protect your data" },
  abstraction: { name: "Abstraction", color: "#b18cff", glyph: "🎭", tagline: "Hide the messy details" },
  inheritance: { name: "Inheritance", color: "#3ddc84", glyph: "🧬", tagline: "Reuse what the parent has" },
  polymorphism: { name: "Polymorphism", color: "#ff9f43", glyph: "🔀", tagline: "Same call, different behavior" },
};

export const SCORING = {
  correct: 1000,
  speedBonusMax: 200, // 20% cap: accuracy first
  streakStep: 100,
  streakMax: 300,
  codeMax: 1500,
  tournamentWin: 500,
  champion: 1500,
};
