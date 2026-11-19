// Tournament director for the projector: qualifiers fast-forward as a grid,
// the last rounds play out as full battles, then the champion is crowned.
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminView, TournamentFighter, TournamentMatch, TournamentResult } from "../../../../shared/types.ts";
import { Sprite } from "../Sprite.tsx";
import { BattleView } from "./BattleView.tsx";
import { sfx, synth } from "../../lib/sound.ts";
import { cannons } from "../../lib/confetti.ts";

type PlanItem =
  | { kind: "grid"; round: number; flatStart: number; flatEnd: number }
  | { kind: "bracket"; round: number; flatStart: number }
  | { kind: "battle"; round: number; match: TournamentMatch; flat: number; numInRound: number; ofRound: number }
  | { kind: "champion"; flatEnd: number };

export function roundName(round: number, totalRounds: number) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 1) return "FINAL";
  if (fromEnd === 2) return "SEMIFINAL";
  if (fromEnd === 3) return "QUARTERFINAL";
  return `ROUND ${round + 1}`;
}

function buildPlan(result: TournamentResult): PlanItem[] {
  const plan: PlanItem[] = [];
  const total = result.rounds.length;
  const animateFrom = Math.max(0, total - 3); // QF, SF, F get full battles
  let flat = 0;
  result.rounds.forEach((round, r) => {
    const start = flat;
    if (r < animateFrom) {
      plan.push({ kind: "grid", round: r, flatStart: start, flatEnd: start + round.length });
      flat += round.length;
      return;
    }
    plan.push({ kind: "bracket", round: r, flatStart: start });
    const battles = round.filter((m) => m.battle);
    let n = 0;
    round.forEach((m) => {
      if (m.battle) plan.push({ kind: "battle", round: r, match: m, flat, numInRound: ++n, ofRound: battles.length });
      flat++;
    });
  });
  plan.push({ kind: "champion", flatEnd: flat });
  return plan;
}

interface Props {
  view: AdminView;
  result: TournamentResult | null;
  emit: (event: string, payload?: unknown) => void;
  sound: boolean;
  cmd: { name: string; n: number };
  preview?: boolean;
}

export function ScreenTournament({ view, result, emit, sound, cmd, preview }: Props) {
  const status = view.tournament.status;

  if (preview) {
    return (
      <Centered>
        <div className="pixel" style={{ fontSize: 80, color: "var(--gold)" }}>⚔️ Tournament</div>
        <div style={{ fontSize: 44 }}>
          {status === "idle" && `${view.submissions.length} submitted · ${view.players.length - view.submissions.length} rookies`}
          {status === "computing" && "Computing battles on the projector…"}
          {status === "playing" && `Playing: ${view.tournament.revealed} / ${view.tournament.totalMatches} matches`}
          {status === "done" && `Champion: ${view.tournament.champion}`}
        </div>
      </Centered>
    );
  }
  if (status === "idle") return <TournamentLobby view={view} />;
  if (status === "computing" || !result) return <Forging view={view} />;
  return <Director view={view} result={result} emit={emit} sound={sound} cmd={cmd} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, textAlign: "center" }}>
      {children}
    </div>
  );
}

function TournamentLobby({ view }: { view: AdminView }) {
  const rookies = view.players.length - view.submissions.length;
  return (
    <Centered>
      <div className="arena-floor" />
      <div className="pixel" style={{ fontSize: 150, fontWeight: 700, color: "var(--gold)", textShadow: "0 10px 0 #000" }}>
        THE TOURNAMENT
      </div>
      <div style={{ fontSize: 46 }}>
        <b style={{ color: "var(--gold)" }}>{view.submissions.length}</b> custom fighters · <b>{rookies}</b> rookies
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center", maxWidth: 1600 }}>
        {view.submissions.slice(0, 40).map((s, i) => (
          <div key={s.id} className="anim-bob" style={{ animationDelay: `${(i % 8) * 0.12}s` }}>
            <Sprite sprite={s.sprite} seed={s.player} size={view.submissions.length > 20 ? 72 : 110} />
          </div>
        ))}
      </div>
      <div className="pixel muted" style={{ fontSize: 34 }}>Waiting for the host to start…</div>
    </Centered>
  );
}

function Forging({ view }: { view: AdminView }) {
  return (
    <Centered>
      <div style={{ display: "flex", gap: 30 }}>
        {(["knight", "mage", "rogue", "golem", "dragon"] as const).map((s, i) => (
          <div key={s} className="anim-bob" style={{ animationDelay: `${i * 0.15}s` }}>
            <Sprite sprite={s} size={140} />
          </div>
        ))}
      </div>
      <div className="pixel" style={{ fontSize: 90, fontWeight: 700, color: "var(--gold)" }}>
        Forging the bracket…
      </div>
      <div style={{ fontSize: 40, color: "var(--muted)" }}>
        Running {view.tournament.entries} fighters through the referee (Python, live in this browser)
      </div>
    </Centered>
  );
}

function Director({ view, result, emit, sound, cmd }: Omit<Props, "preview"> & { result: TournamentResult }) {
  const plan = useMemo(() => buildPlan(result), [result]);
  const byId = useMemo(() => new Map(result.fighters.map((f) => [f.id, f])), [result]);
  const totalRounds = result.rounds.length;

  // Resume where the server says we are (e.g. after a reload)
  const [idx, setIdx] = useState(() => {
    const revealed = view.tournament.revealed;
    if (view.tournament.status === "done") return plan.length - 1;
    const i = plan.findIndex((p) =>
      p.kind === "grid" ? p.flatEnd > revealed : p.kind === "battle" ? p.flat >= revealed : p.kind === "champion",
    );
    return Math.max(0, i);
  });
  const [speed, setSpeed] = useState(1);
  const [skip, setSkip] = useState(0);
  const item = plan[idx];

  // host remote + keyboard
  const lastCmd = useRef(cmd.n);
  useEffect(() => {
    if (cmd.n === lastCmd.current) return;
    lastCmd.current = cmd.n;
    if (cmd.name === "skip") setSkip((s) => s + 1);
    if (cmd.name === "speed") setSpeed((s) => (s === 1 ? 2 : 1));
  }, [cmd]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") setSkip((s) => s + 1);
      if (e.key === "f") setSpeed((s) => (s === 1 ? 2 : 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (sound) synth.music(item?.kind === "champion" ? null : "battle");
  }, [item?.kind, sound]);

  // report progress so students' laptops stay in sync
  useEffect(() => {
    if (!item) return;
    if (item.kind === "battle") {
      const a = byId.get(item.match.a!);
      const b = byId.get(item.match.b!);
      emit("tournament:progress", { revealed: item.flat, current: a && b ? { a: `${a.name} (${a.player})`, b: `${b.name} (${b.player})` } : null });
    } else if (item.kind === "bracket") {
      emit("tournament:progress", { revealed: item.flatStart, current: null });
    }
  }, [item, byId, emit]);

  const next = (revealedTo?: number) => {
    if (revealedTo !== undefined) emit("tournament:progress", { revealed: revealedTo, current: null });
    setIdx((i) => Math.min(plan.length - 1, i + 1));
  };

  // advance non-battle items on timers (skip also advances them)
  useEffect(() => {
    if (!item || item.kind === "battle" || item.kind === "champion") return;
    const count = item.kind === "grid" ? item.flatEnd - item.flatStart : 0;
    const ms = item.kind === "grid" ? Math.min(14000, 3500 + count * 180) : 3800;
    const t = setTimeout(() => next(item.kind === "grid" ? item.flatEnd : undefined), ms / speed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, speed]);
  const skipAtItem = useRef(skip);
  useEffect(() => {
    if (skip === skipAtItem.current) return;
    skipAtItem.current = skip;
    if (item && (item.kind === "grid" || item.kind === "bracket")) next(item.kind === "grid" ? item.flatEnd : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  if (!item) return null;

  return (
    <>
      {item.kind === "grid" && <QualifierGrid key={idx} round={result.rounds[item.round]} label={roundName(item.round, totalRounds)} byId={byId} sound={sound} />}
      {item.kind === "bracket" && <BracketTree key={idx} result={result} fromRound={Math.max(0, totalRounds - 3)} upTo={item.flatStart} byId={byId} highlightRound={item.round} />}
      {item.kind === "battle" && (
        <BattleView
          key={idx}
          battle={item.match.battle!}
          fighters={[byId.get(item.match.a!)!, byId.get(item.match.b!)!] as [TournamentFighter, TournamentFighter]}
          label={`${roundName(item.round, totalRounds)}${item.ofRound > 1 ? ` · MATCH ${item.numInRound} OF ${item.ofRound}` : ""}${speed > 1 ? " · ⏩ 2×" : ""}`}
          speed={speed}
          skipSignal={skip}
          sound={sound}
          cheers={view.tournament.cheers}
          onDone={() => next(item.flat + 1)}
        />
      )}
      {item.kind === "champion" && <Champion result={result} byId={byId} sound={sound} onShown={() => emit("tournament:done")} />}
      {result.disqualified.length > 0 && item.kind === "bracket" && (
        <div style={{ position: "absolute", left: 60, bottom: 30, fontSize: 24, color: "var(--muted)" }}>
          🚫 Disqualified by the referee: {result.disqualified.map((d) => d.player).join(", ")}
        </div>
      )}
    </>
  );
}

function QualifierGrid({ round, label, byId, sound }: { round: TournamentMatch[]; label: string; byId: Map<string, TournamentFighter>; sound: boolean }) {
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    const step = Math.max(60, Math.min(260, 6000 / Math.max(1, round.length)));
    let i = 0;
    const t = setInterval(() => {
      i++;
      setRevealed(i);
      if (sound && i % 2 === 0) sfx("hit");
      if (i >= round.length) clearInterval(t);
    }, step);
    const start = setTimeout(() => {}, 0);
    return () => {
      clearInterval(t);
      clearTimeout(start);
    };
  }, [round, sound]);
  const cols = round.length > 24 ? 6 : round.length > 12 ? 4 : 3;
  const small = round.length > 24;
  return (
    <div style={{ position: "absolute", inset: 0, padding: "60px 70px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="pixel" style={{ fontSize: 64, fontWeight: 700, color: "var(--gold)", textAlign: "center" }}>
        {label} <span className="muted" style={{ fontSize: 36 }}>· fast-forward ⏩</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: small ? 10 : 16, alignContent: "start" }}>
        {round.map((m, i) => {
          const done = i < revealed;
          const sides = [m.a, m.b].map((id) => (id ? byId.get(id) : null));
          return (
            <div key={i} className="card" style={{ padding: small ? "8px 12px" : "12px 18px", display: "flex", flexDirection: "column", gap: 4, borderRadius: 14 }}>
              {sides.map((f, s) => {
                const isWinner = done && f && m.winner === f.id;
                const isLoser = done && f && m.winner !== f.id;
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: small ? 20 : 26, fontWeight: 700, opacity: isLoser ? 0.3 : 1, transition: "opacity 0.3s", textDecoration: isLoser ? "line-through" : "none" }}>
                    {f ? <Sprite sprite={f.sprite} seed={f.player} size={small ? 28 : 40} /> : <span style={{ width: small ? 28 : 40 }} />}
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f ? f.player : "— bye —"}</span>
                    {isWinner && <span style={{ color: "var(--gold)" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketTree({ result, fromRound, upTo, byId, highlightRound }: { result: TournamentResult; fromRound: number; upTo: number; byId: Map<string, TournamentFighter>; highlightRound: number }) {
  // flat index of the first match of each round
  const starts: number[] = [];
  let flat = 0;
  result.rounds.forEach((r) => {
    starts.push(flat);
    flat += r.length;
  });
  const rounds = result.rounds.slice(fromRound);
  return (
    <div style={{ position: "absolute", inset: 0, padding: "60px 60px", display: "flex", flexDirection: "column", gap: 30 }}>
      <div className="pixel" style={{ fontSize: 70, fontWeight: 700, color: "var(--gold)", textAlign: "center" }}>
        Up next: {roundName(highlightRound, result.rounds.length)}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 50, justifyContent: "center" }}>
        {rounds.map((round, ri) => {
          const r = ri + fromRound;
          return (
            <div key={r} style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 20, width: 440 }}>
              <div className="pixel" style={{ textAlign: "center", fontSize: 30, color: r === highlightRound ? "var(--gold)" : "var(--muted)" }}>
                {roundName(r, result.rounds.length)}
              </div>
              {round.map((m, mi) => {
                const known = starts[r] + mi < upTo;
                const active = r === highlightRound;
                return (
                  <div
                    key={mi}
                    className={`card ${active ? "anim-pop" : ""}`}
                    style={{ padding: "10px 16px", borderColor: active ? "var(--gold)" : "var(--line)", animationDelay: `${mi * 0.1}s`, boxShadow: active ? "0 0 30px rgba(255,204,77,0.25)" : undefined }}
                  >
                    {[m.a, m.b].map((id, s) => {
                      const f = id ? byId.get(id) : null;
                      const won = known && f && m.winner === f.id;
                      const lost = known && f && m.winner !== f.id;
                      return (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 28, fontWeight: 700, opacity: lost ? 0.35 : 1, padding: "4px 0" }}>
                          {f ? <Sprite sprite={f.sprite} seed={f.player} size={44} /> : <span style={{ width: 44 }} />}
                          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {f ? f.name : r === fromRound || !m.bye ? "?" : "— bye —"}
                            {f && <span className="muted" style={{ fontSize: 20 }}> · {f.player}</span>}
                          </span>
                          {won && <span style={{ color: "var(--gold)" }}>🏆</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Champion({ result, byId, sound, onShown }: { result: TournamentResult; byId: Map<string, TournamentFighter>; sound: boolean; onShown: () => void }) {
  const champ = result.champion ? byId.get(result.champion) : null;
  const shown = useRef(false);
  useEffect(() => {
    if (sound) {
      synth.music(null);
      sfx("fanfare");
    }
    cannons();
    const t = setTimeout(() => {
      if (!shown.current) {
        shown.current = true;
        onShown();
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!champ) return <Centered><div className="pixel" style={{ fontSize: 80 }}>No champion this time!</div></Centered>;
  return (
    <Centered>
      <div className="arena-floor" />
      <div className="pixel" style={{ fontSize: 56, color: "var(--muted)", letterSpacing: "0.15em" }}>TOURNAMENT CHAMPION</div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: -90, transform: "translateX(-50%)", fontSize: 130 }} className="anim-bob">
          👑
        </div>
        <div style={{ borderRadius: "50%", padding: 30, animation: "glow 2s ease-in-out infinite" }}>
          <Sprite sprite={champ.sprite} seed={champ.player} size={380} />
        </div>
      </div>
      <div className="pixel" style={{ fontSize: 110, fontWeight: 700, color: "var(--gold)", textShadow: "0 8px 0 #000" }}>{champ.name}</div>
      <div style={{ fontSize: 44, fontWeight: 700 }}>
        coded by <span style={{ color: "var(--cyan)" }}>{champ.player}</span> · <span className="mono" style={{ color: "var(--code-cls)" }}>class {champ.cls}(Fighter)</span>
      </div>
      <div className="card" style={{ padding: "16px 30px", fontSize: 38, fontStyle: "italic" }}>“{champ.cry}”</div>
    </Centered>
  );
}
