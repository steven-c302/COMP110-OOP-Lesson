import { describe, expect, it } from "vitest";
import { RESULTS_HOLD_MS, Session, cleanName, type Clock } from "../server/session.ts";
import type { Step } from "../shared/types.ts";

function fakeClock() {
  let now = 1_000_000;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let next = 1;
  const clock: Clock = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = next++;
      timers.push({ at: now + ms, fn, id });
      return id;
    },
    clearTimeout: (id) => {
      timers = timers.filter((t) => t.id !== id);
    },
  };
  const advance = (ms: number) => {
    const target = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > target) break;
      timers.shift();
      now = t.at;
      t.fn();
    }
    now = target;
  };
  return { clock, advance };
}

const STEPS: Step[] = [
  { id: "lobby", type: "lobby" },
  { id: "q1", type: "quiz", kind: "choice", prompt: "?", choices: ["a", "b", "c", "d"], correct: 1, seconds: 20, readSeconds: 4 },
  { id: "q2", type: "quiz", kind: "choice", prompt: "?", choices: ["a", "b"], correct: 0, seconds: 20, readSeconds: 4 },
  { id: "lb", type: "leaderboard" },
  { id: "task", type: "code", pillar: "encapsulation", taskId: "encapsulation", title: "t", goal: "g", hints: [], seconds: 60 },
  { id: "tour", type: "tournament" },
];

function setup() {
  const { clock, advance } = fakeClock();
  const s = new Session(STEPS, clock);
  const join = (name: string) => {
    const r = s.join(name);
    if (!r.ok) throw new Error(r.error);
    return r.player;
  };
  return { s, advance, join };
}

describe("names", () => {
  it("filters and validates nicknames", () => {
    expect(cleanName("Brave Wyvern").ok).toBe(true);
    expect(cleanName("x").ok).toBe(false);
    expect(cleanName("sh1t lord").ok).toBe(false);
    expect(cleanName("Classy Bass").ok).toBe(true);
  });

  it("rejects duplicate nicknames", () => {
    const { s, join } = setup();
    join("Alex");
    expect(s.join("alex").ok).toBe(false);
  });
});

describe("quiz flow", () => {
  it("locks answers while reading, then scores correct answers with a capped speed bonus", () => {
    const { s, advance, join } = setup();
    const a = join("Ana");
    const b = join("Ben");
    join("Cat");
    s.goto(1);
    expect(s.answer(a.id, "q1", 1)).toBe(false); // reading lock
    advance(4000);
    expect(s.quiz?.phase).toBe("open");
    expect(s.answer(a.id, "q1", 1)).toBe(true);
    expect(s.answer(a.id, "q1", 2)).toBe(false); // one answer per round
    advance(10_000);
    s.answer(b.id, "q1", 0);
    advance(10_000); // timer runs out (Cat never answers)
    expect(s.quiz?.phase).toBe("closed");
    s.quizAction("reveal");
    expect(a.score).toBe(1200); // instant answer: 1000 + full 200 speed bonus
    expect(b.score).toBe(0);
  });

  it("closes once everyone answered, shows the split to students, then auto-reveals", () => {
    const { s, advance, join } = setup();
    const a = join("Ana");
    const b = join("Ben");
    s.goto(1);
    advance(4000);
    s.answer(a.id, "q1", 1);
    expect(s.studentView(a.id)!.quiz!.counts1).toBeUndefined(); // no peeking while voting
    s.answer(b.id, "q1", 2);
    expect(s.quiz?.phase).toBe("closed");
    const results = s.studentView(a.id)!;
    expect(results.quiz!.counts1).toEqual([0, 1, 1, 0]); // results first...
    expect(results.quiz!.correct).toBeUndefined(); // ...answer second
    expect(results.step).not.toHaveProperty("correct");
    advance(RESULTS_HOLD_MS);
    expect(s.quiz?.phase).toBe("revealed");
    expect(s.studentView(a.id)!.quiz!.correct).toBe(1);
    expect(a.score).toBeGreaterThan(0);
  });

  it("host can hold the results screen", () => {
    const { s, advance, join } = setup();
    const a = join("Ana");
    s.goto(1);
    advance(4000);
    s.answer(a.id, "q1", 1);
    s.quizAction("hold");
    advance(60_000);
    expect(s.quiz?.phase).toBe("closed");
  });

  it("never scores the revote, and hides the live revote split until it closes", () => {
    const { s, advance, join } = setup();
    const a = join("Ana");
    const b = join("Ben");
    s.goto(1);
    advance(4000);
    s.answer(a.id, "q1", 0);
    s.answer(b.id, "q1", 0);
    s.quizAction("discuss");
    expect(s.quiz?.phase).toBe("discuss");
    expect(s.studentView(a.id)!.step).not.toHaveProperty("correct");
    advance(60_000);
    expect(s.quiz?.phase).toBe("revote");
    s.answer(a.id, "q1", 1);
    expect(s.studentView(a.id)!.quiz!.counts2).toBeUndefined();
    s.answer(b.id, "q1", 1);
    expect(s.studentView(a.id)!.quiz!.counts2).toEqual([0, 2, 0, 0]);
    s.quizAction("reveal");
    expect(a.score).toBe(0);
    const view = s.studentView(a.id)!;
    expect(view.quiz!.counts1).toEqual([2, 0, 0, 0]);
    expect(view.quiz!.counts2).toEqual([0, 2, 0, 0]);
    expect(view.step).toHaveProperty("correct", 1);
  });

  it("awards streak bonuses and still scores if the host skips the reveal", () => {
    const { s, advance, join } = setup();
    const a = join("Ana");
    s.updateSettings({ speedBonus: false });
    s.goto(1);
    advance(4000);
    s.answer(a.id, "q1", 1);
    s.goto(2); // skipped reveal
    expect(a.score).toBe(1000);
    advance(4000);
    s.answer(a.id, "q2", 0);
    s.quizAction("reveal");
    expect(a.score).toBe(1000 + 1000 + 100);
    expect(a.streak).toBe(2);
  });
});

describe("players", () => {
  it("reconnecting with the token keeps the score", () => {
    const { s, advance, join } = setup();
    const a = join("Ana");
    s.goto(1);
    advance(4000);
    s.answer(a.id, "q1", 1);
    s.quizAction("reveal");
    s.setConnected(a.id, false);
    const again = s.join("whatever", a.token);
    expect(again.ok && again.player.id).toBe(a.id);
    expect(again.ok && again.player.score).toBeGreaterThan(0);
  });

  it("relative leaderboard shows neighbors and climbers", () => {
    const { s, advance, join } = setup();
    const players = ["Ana", "Ben", "Cat", "Dan", "Eve", "Fay"].map(join);
    s.goto(1);
    advance(4000);
    s.answer(players[5].id, "q1", 1);
    s.quizAction("reveal");
    s.goto(3);
    const me = s.studentView(players[5].id)!.me;
    expect(me.rank).toBe(1);
    expect(me.neighbors.length).toBeGreaterThan(1);
    expect(s.climbers()).toEqual([]); // no fake climbers on the first leaderboard
    s.goto(4); // leaving the leaderboard records everyone's rank
    s.codeResult(players[2].id, "task", { passed: 6, total: 6, code: "", tests: [] });
    expect(s.climbers()[0].id).toBe(players[2].id);
  });
});

describe("code tasks and tournament", () => {
  it("keeps the best code score and only adds the difference", () => {
    const { s, join } = setup();
    const a = join("Ana");
    s.goto(4);
    s.codeResult(a.id, "task", { passed: 3, total: 6, code: "x", tests: [] });
    expect(a.score).toBe(750);
    s.codeResult(a.id, "task", { passed: 2, total: 6, code: "y", tests: [] });
    expect(a.score).toBe(750);
    s.codeResult(a.id, "task", { passed: 6, total: 6, code: "z", tests: [] });
    expect(a.score).toBe(1500);
  });

  it("enters every player in the tournament (defaults for non-submitters) and awards wins", () => {
    const { s, join } = setup();
    const a = join("Ana");
    const b = join("Ben");
    s.submitFighter(a.id, "code", { name: "Ember", sprite: "mage" });
    s.goto(5);
    const entries = s.startTournament()!;
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.id === b.id)!.isDefault).toBe(true);
    expect(s.submitFighter(a.id, "new", {})).toBe("Submissions are locked");
    s.tournamentResult({
      fighters: [],
      disqualified: [],
      champion: a.id,
      rounds: [[{ a: a.id, b: b.id, winner: a.id, battle: {} as never }]],
    });
    s.tournamentDone();
    expect(a.score).toBe(500 + 1500);
    s.tournamentDone();
    expect(a.score).toBe(2000); // idempotent
  });
});
