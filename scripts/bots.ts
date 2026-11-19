// Load test / rehearsal helper: simulates a class of students.
//   npm run bots -- 40                 (40 bots against http://localhost:3471)
//   npm run bots -- 40 https://your-app.onrender.com
// Bots join, answer quizzes, "run tests", submit varied fighters (including one
// that hangs sometimes and one that crashes), and cheer during the tournament.
import { io, type Socket } from "socket.io-client";
import type { StudentView } from "../shared/types.ts";

const COUNT = Number(process.argv[2] ?? 30);
const URL = process.argv[3] ?? "http://localhost:3471";
const SPRITES = ["knight", "mage", "rogue", "golem", "slime", "dragon", "skeleton", "archer"];
const ADJ = ["Brave", "Swift", "Clever", "Mighty", "Sneaky", "Cosmic", "Glitchy", "Lucky", "Bold", "Shiny", "Turbo", "Frosty"];
const NOUN = ["Wyvern", "Golem", "Kraken", "Goblin", "Yeti", "Hydra", "Troll", "Imp", "Lich", "Ogre", "Djinn", "Mimic"];

function rand<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function randomStats() {
  for (;;) {
    const hp = 50 + 10 * Math.floor(Math.random() * 11);
    const power = 4 + Math.floor(Math.random() * 18);
    const defense = Math.floor(Math.random() * 13);
    const speed = 1 + Math.floor(Math.random() * 15);
    if (Math.floor(hp / 10) + power + defense + speed <= 40) return { hp, power, defense, speed };
  }
}

const STRATEGIES = [
  `        if self.hp_percent < 35 and self.potions > 0:
            return self.heal()
        if enemy.defense >= 8:
            return self.heavy_strike()
        return self.strike()`,
  `        if enemy.last_move == "heavy":
            return self.guard()
        if self.hp_percent < 25 and self.potions:
            return self.heal()
        return self.heavy_strike()`,
  `        if enemy.guarding:
            return self.guard()
        return self.strike() if enemy.hp_percent > 30 else self.heavy_strike()`,
];

function fighterCode(i: number, name: string) {
  const s = randomStats();
  const cls = `Bot${i}Fighter`;
  let strategy = rand(STRATEGIES);
  if (i === 1) strategy = `        while enemy.hp_percent < 50:\n            pass\n        return self.strike()`; // hangs sometimes
  if (i === 2) strategy = `        return self.strike() if self.hp_percent > 60 else 1 / 0`; // crashes when hurt
  const sprite = rand(SPRITES);
  return {
    code: `from arena import Fighter


class ${cls}(Fighter):
    SPRITE = "${sprite}"

    def __init__(self):
        super().__init__(name=${JSON.stringify(name)}, hp=${s.hp}, power=${s.power}, defense=${s.defense}, speed=${s.speed})

    def choose_move(self, enemy):
${strategy}

    def battle_cry(self):
        return "Beep boop, I am bot ${i}!"
`,
    card: { name, sprite, cls, cry: `Beep boop, I am bot ${i}!`, maxHp: s.hp, power: s.power, defense: s.defense, speed: s.speed },
  };
}

function runBot(i: number): Socket {
  const name = `${rand(ADJ)} ${rand(NOUN)} ${i}`;
  const socket = io(URL, { auth: { role: "student" }, transports: ["websocket"], forceNew: true });
  const done = new Set<string>();
  socket.on("need_join", () =>
    socket.emit("join", { name }, (r: { ok: boolean; error?: string; token?: string }) => {
      if (!r.ok) console.log(`bot ${i}: ${r.error}`);
      else socket.auth = { role: "student", token: r.token }; // reconnect keeps identity, like real students
    }),
  );
  socket.on("state", (v: StudentView) => {
    if (process.env.BOT_DEBUG && i === 1) console.log(`bot1 state ${v.step.id} ${v.quiz?.phase ?? ""} answer=${v.me.answer}`);
    const step = v.step;
    const q = v.quiz;
    if (step.type === "quiz" && q && (q.phase === "open" || q.phase === "revote")) {
      const key = `${step.id}-${q.round}`;
      if (!done.has(key) && v.me.answer === null) {
        done.add(key);
        // biased toward the first two choices so distributions look realistic
        const choice = Math.random() < 0.6 ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * step.choices.length);
        setTimeout(() => socket.emit("answer", { stepId: step.id, choice }), 800 + Math.random() * 9000);
      }
    }
    if (step.type === "code" && !done.has(step.id)) {
      done.add(step.id);
      const total = 5;
      const tries = 1 + Math.floor(Math.random() * 3);
      for (let t = 1; t <= tries; t++) {
        const passed = Math.min(total, Math.floor(Math.random() * (total + 1)) + t);
        setTimeout(
          () =>
            socket.emit("codeResult", {
              stepId: step.id,
              passed,
              total,
              code: "# bot",
              tests: Array.from({ length: total }, (_, k) => ({ name: `check ${k + 1}`, passed: k < passed })),
            }),
          2000 + t * 4000 + Math.random() * 4000,
        );
      }
      if (step.submitFighter && i % 6 !== 5) {
        const f = fighterCode(i, `${name.split(" ")[0]} Bot${i}`.slice(0, 24));
        setTimeout(() => socket.emit("submitFighter", f, () => {}), 3000 + Math.random() * 8000);
      }
    }
    if (step.type === "tournament" && v.tournament?.currentMatch && Math.random() < 0.3) {
      socket.emit("cheer", Math.random() < 0.5 ? 0 : 1);
    }
  });
  return socket;
}

console.log(`Starting ${COUNT} bots against ${URL} (Ctrl+C to stop)`);
const sockets = Array.from({ length: COUNT }, (_, i) => runBot(i + 1));
process.on("SIGINT", () => {
  sockets.forEach((s) => s.disconnect());
  process.exit(0);
});
