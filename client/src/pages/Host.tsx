// /host: the TA's control panel (run-sheet, live stats, controls, player list).
import { useEffect, useMemo, useState } from "react";
import { PILLARS, type AdminView, type QuizStep, type Step } from "../../../shared/types.ts";
import { useAdmin, useTick } from "../lib/socket.ts";
import { PinGate } from "../components/PinGate.tsx";
import { ScreenView } from "../components/screen/ScreenView.tsx";
import { Loading } from "./Screen.tsx";
import { LETTERS } from "../components/Shapes.tsx";
import { setConfettiEnabled } from "../lib/confetti.ts";
import "../styles/host.css";

const TYPE_ICON: Record<Step["type"], string> = {
  lobby: "🚪",
  slide: "🖼️",
  quiz: "❓",
  code: "💻",
  leaderboard: "🏆",
  tournament: "⚔️",
  podium: "🥇",
};

function stepTitle(s: Step): string {
  switch (s.type) {
    case "slide":
      return s.title;
    case "quiz":
      return s.prompt;
    case "code":
      return s.title;
    case "leaderboard":
      return s.title ?? "Leaderboard";
    case "lobby":
      return "Lobby: students join";
    case "tournament":
      return "Tournament";
    case "podium":
      return "Final podium";
  }
}

function stepMinutes(s: Step): number {
  if (s.minutes) return s.minutes;
  if (s.type === "quiz") return ((s.readSeconds ?? 4) + s.seconds + 25) / 60;
  return 0.5;
}

export default function Host() {
  const { view, status, setPin, emit, now } = useAdmin();
  useTick(250);

  useEffect(() => {
    setConfettiEnabled(false);
    return () => setConfettiEnabled(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!view || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") emit("goto", view.stepIndex + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") emit("goto", view.stepIndex - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, emit]);

  if (status === "need_pin" || status === "bad_pin") {
    return <PinGate role="Host controls" onPin={setPin} error={status === "bad_pin" ? "Wrong PIN" : undefined} />;
  }
  if (!view) return <Loading />;
  const step = view.steps[view.stepIndex];

  return (
    <div className="host">
      <TopBar view={view} emit={emit} offline={status === "offline"} />
      <div className="host-body">
        <RunSheet view={view} emit={emit} />
        <main className="host-main">
          <div className="host-preview">
            <ScreenView view={view} now={now()} emit={() => {}} sound={false} preview result={null} cmd={{ name: "", n: 0 }} />
          </div>
          <div className="host-nav">
            <button className="btn" disabled={view.stepIndex === 0} onClick={() => emit("goto", view.stepIndex - 1)}>
              ← Prev
            </button>
            <div className="host-step-label">
              <span className="chip">
                {TYPE_ICON[step.type]} {view.stepIndex + 1} / {view.steps.length}
              </span>
              <span className="host-step-title">{stepTitle(step)}</span>
            </div>
            <button className="btn btn-gold" disabled={view.stepIndex === view.steps.length - 1} onClick={() => emit("goto", view.stepIndex + 1)}>
              Next →
            </button>
          </div>
          <StepControls view={view} emit={emit} now={now()} />
          {step.notes && (
            <div className="card host-notes">
              <b>🗒 Notes:</b> {step.notes}
            </div>
          )}
        </main>
        <Players view={view} emit={emit} />
      </div>
    </div>
  );
}

function TopBar({ view, emit, offline }: { view: AdminView; emit: (e: string, p?: unknown) => void; offline: boolean }) {
  const s = view.settings;
  const online = view.players.filter((p) => p.connected).length;
  const toggle = (key: keyof AdminView["settings"], value: unknown) => emit("settings", { [key]: value });
  return (
    <header className="host-top">
      <div className="pixel host-brand">⚔️ OOP Arena · Host</div>
      <span className="chip">👥 {online} online / {view.players.length}</span>
      {offline && <span className="chip" style={{ color: "var(--dmg)" }}>Reconnecting…</span>}
      <div style={{ flex: 1 }} />
      <button className="btn btn-sm" onClick={() => window.open("/screen", "oop-arena-screen", "width=1280,height=720")}>
        📽 Open projector window
      </button>
      <button className="btn btn-sm" onClick={() => toggle("muted", !s.muted)}>{s.muted ? "🔇 Muted" : "🔊 Sound on"}</button>
      <button className="btn btn-sm" onClick={() => toggle("theme", s.theme === "dark" ? "light" : "dark")}>
        {s.theme === "dark" ? "🌙 Dark" : "☀️ Light"}
      </button>
      <button className="btn btn-sm" onClick={() => toggle("speedBonus", !s.speedBonus)} title="Up to +20% for fast correct answers">
        ⚡ Speed bonus {s.speedBonus ? "on" : "off"}
      </button>
      <button className="btn btn-sm" onClick={() => toggle("lateJoin", !s.lateJoin)}>🚪 Late join {s.lateJoin ? "on" : "off"}</button>
      <button className="btn btn-sm" onClick={() => toggle("reducedMotion", !s.reducedMotion)}>🎞 Motion {s.reducedMotion ? "reduced" : "full"}</button>
      <button
        className="btn btn-sm btn-red"
        onClick={() => {
          if (confirm("Reset the whole session? This removes all players and scores.")) emit("reset");
        }}
      >
        Reset
      </button>
    </header>
  );
}

function RunSheet({ view, emit }: { view: AdminView; emit: (e: string, p?: unknown) => void }) {
  let elapsed = 0;
  return (
    <nav className="host-runsheet">
      {view.steps.map((s, i) => {
        const startAt = elapsed;
        elapsed += stepMinutes(s);
        const color = s.pillar ? PILLARS[s.pillar].color : "var(--muted)";
        return (
          <button key={s.id} className={`runsheet-row ${i === view.stepIndex ? "current" : ""} ${i < view.stepIndex ? "done" : ""}`} onClick={() => emit("goto", i)}>
            <span className="runsheet-time mono">{Math.floor(startAt)}′</span>
            <span className="runsheet-bar" style={{ background: color }} />
            <span>{TYPE_ICON[s.type]}</span>
            <span className="runsheet-title">{stepTitle(s)}</span>
          </button>
        );
      })}
      <div className="muted" style={{ padding: "8px 12px", fontSize: 13 }}>
        Planned total ≈ {Math.round(elapsed)} min · ← → keys navigate
      </div>
    </nav>
  );
}

function StepControls({ view, emit, now }: { view: AdminView; emit: (e: string, p?: unknown) => void; now: number }) {
  const step = view.steps[view.stepIndex];
  if (step.type === "quiz" && view.quiz) return <QuizControls step={step} view={view} emit={emit} now={now} />;
  if (step.type === "code") {
    const c = view.code;
    const elapsed = c ? Math.max(0, Math.floor((now - c.startedAt) / 1000)) : 0;
    return (
      <div className="card host-panel">
        <div className="host-panel-head">
          <b>💻 {step.title}</b>
          <span className="chip">⏱ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} / {Math.round(step.seconds / 60)} min</span>
          <span className="chip">▶ ran tests: {c?.started ?? 0}</span>
          <span className="chip" style={{ color: "var(--hp)" }}>✓ all passing: {c?.allPassed ?? 0}</span>
          {step.submitFighter && (
            <>
              <span className="chip">⚔️ submitted: {view.submissions.length}</span>
              <button className="btn btn-sm" onClick={() => emit("lock", !view.submissionsLocked)}>
                {view.submissionsLocked ? "🔒 Locked (unlock)" : "🔓 Open (lock)"}
              </button>
            </>
          )}
        </div>
        <div className="muted" style={{ fontSize: 13, margin: "6px 0 10px" }}>
          Pass rate per test. A low bar means it's time for a 20-second hint to the whole room.
        </div>
        {(c?.perTest ?? []).map((t) => {
          const pct = t.attempted ? Math.round((100 * t.passed) / t.attempted) : 0;
          return (
            <div key={t.name} className="test-row">
              <span className="test-name">{t.name}</span>
              <div className="test-bar">
                <div style={{ width: `${pct}%`, background: pct < 50 ? "var(--dmg)" : pct < 75 ? "var(--amber)" : "var(--hp)" }} />
              </div>
              <span className="mono" style={{ width: 90, textAlign: "right" }}>
                {t.passed}/{t.attempted}
              </span>
            </div>
          );
        })}
        {(c?.perTest.length ?? 0) === 0 && <div className="muted">No test runs yet.</div>}
        <details style={{ marginTop: 10 }}>
          <summary className="muted">Hints students can unlock (60 s / 120 s)</summary>
          {step.hints.map((h, i) => (
            <pre key={i} className="mono host-hint">{h}</pre>
          ))}
        </details>
      </div>
    );
  }
  if (step.type === "tournament") {
    const t = view.tournament;
    return (
      <div className="card host-panel">
        <div className="host-panel-head">
          <b>⚔️ Tournament</b>
          <span className="chip">status: {t.status}</span>
          <span className="chip">custom fighters: {view.submissions.length}</span>
          <span className="chip">rookies: {view.players.length - view.submissions.length}</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          {t.status === "idle" && (
            <button className="btn btn-gold" disabled={view.players.length === 0} onClick={() => emit("tournament:start")}>
              ▶ Start tournament
            </button>
          )}
          {t.status === "playing" && (
            <>
              <button className="btn" onClick={() => emit("screen:cmd", "skip")}>⏭ Skip (battle or round)</button>
              <button className="btn" onClick={() => emit("screen:cmd", "speed")}>⏩ Toggle 2× speed</button>
              <span className="chip">
                match {t.revealed} / {t.totalMatches}
              </span>
            </>
          )}
          {t.status === "computing" && <span className="chip">Computing on the projector… (is /screen open?)</span>}
          {t.status === "done" && <span className="chip" style={{ color: "var(--gold)" }}>🏆 {t.champion}</span>}
          {t.status !== "idle" && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                if (confirm("Reset the tournament? (Points already awarded stay.)")) emit("tournament:reset");
              }}
            >
              Reset tournament
            </button>
          )}
        </div>
        {t.disqualified.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 14 }}>
            <b>Disqualified by the referee:</b>
            {t.disqualified.map((d) => (
              <div key={d.player} className="mono muted">
                {d.player}: {d.error}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (step.type === "podium") {
    return (
      <div className="card host-panel">
        <button className="btn" onClick={() => emit("screen:cmd", "podium")}>🔁 Replay podium reveal</button>
      </div>
    );
  }
  return null;
}

function QuizControls({ step, view, emit, now }: { step: QuizStep; view: AdminView; emit: (e: string, p?: unknown) => void; now: number }) {
  const q = view.quiz!;
  const counts = (q.round === 2 ? q.counts2 : q.counts1) ?? [];
  const total = counts.reduce((a, b) => a + b, 0);
  const correctPct = step.correct !== undefined && q.counts1 ? Math.round((100 * (q.counts1[step.correct] ?? 0)) / Math.max(1, q.counts1.reduce((a, b) => a + b, 0))) : null;
  const left = q.endsAt ? Math.max(0, Math.ceil((q.endsAt - now) / 1000)) : 0;
  const suggestRevote = correctPct !== null && correctPct < 70 && q.round === 1;
  return (
    <div className="card host-panel">
      <div className="host-panel-head">
        <b>❓ {step.label ?? "Question"}</b>
        <span className="chip">phase: {q.phase}{q.round === 2 ? " (revote)" : ""}</span>
        {q.endsAt > 0 && <span className="chip">⏱ {left}s</span>}
        <span className="chip">answered {q.answered}/{q.eligible}</span>
        {correctPct !== null && q.phase !== "reading" && (
          <span className="chip" style={{ color: correctPct < 70 ? "var(--amber)" : "var(--hp)" }}>
            first vote correct: {correctPct}%
          </span>
        )}
      </div>
      <div className="dist">
        {step.choices.map((c, i) => {
          const n = counts[i] ?? 0;
          return (
            <div key={i} className="dist-row">
              <b style={{ width: 18, color: step.correct === i ? "var(--hp)" : "var(--muted)" }}>{LETTERS[i]}</b>
              <span className="dist-label">
                {c} {step.correct === i && <b style={{ color: "var(--hp)" }}>✓</b>}
              </span>
              <div className="test-bar">
                <div style={{ width: `${total ? (100 * n) / total : 0}%`, background: step.correct === i ? "var(--hp)" : "var(--cyan)" }} />
              </div>
              <span className="mono" style={{ width: 40, textAlign: "right" }}>{n}</span>
            </div>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize: 13, margin: "6px 0" }}>
        Live bars are host-only while voting. When voting ends (time's up or everyone answered), the room sees the split, then the
        answer reveals automatically after 6 s. Hold to talk it through, or Discuss &amp; revote.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {q.phase === "reading" && <button className="btn" onClick={() => emit("quiz", "close")}>Open answers now</button>}
        {(q.phase === "open" || q.phase === "revote") && (
          <>
            <button className="btn" onClick={() => emit("quiz", "extend")}>+10 s</button>
            <button className="btn" onClick={() => emit("quiz", "close")}>End now</button>
          </>
        )}
        {q.phase === "closed" && q.endsAt > 0 && (
          <button className="btn" onClick={() => emit("quiz", "hold")}>
            ⏸ Hold (auto-reveal in {left}s)
          </button>
        )}
        {q.phase === "closed" && q.round === 1 && step.kind !== "poll" && (
          <button className={`btn ${suggestRevote ? "btn-gold" : ""}`} onClick={() => emit("quiz", "discuss")}>
            🗣 Discuss &amp; revote {suggestRevote && "(recommended)"}
          </button>
        )}
        {q.phase === "discuss" && (
          <>
            <button className="btn" onClick={() => emit("quiz", "extend")}>+10 s</button>
            <button className="btn btn-gold" onClick={() => emit("quiz", "revote")}>Open revote now</button>
          </>
        )}
        {(q.phase === "closed" || q.phase === "discuss") && (
          <button className={`btn ${suggestRevote && q.phase === "closed" ? "" : "btn-gold"}`} onClick={() => emit("quiz", "reveal")}>
            ✨ Reveal answer
          </button>
        )}
        {q.phase === "revealed" && <span className="chip">Revealed. Press Next → when ready</span>}
      </div>
    </div>
  );
}

function Players({ view, emit }: { view: AdminView; emit: (e: string, p?: unknown) => void }) {
  const [filter, setFilter] = useState("");
  const step = view.steps[view.stepIndex];
  const rank = useMemo(() => new Map(view.leaderboard.map((r) => [r.id, r.rank])), [view.leaderboard]);
  const players = [...view.players]
    .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  return (
    <aside className="host-players">
      <input className="host-search" placeholder={`Search ${view.players.length} players…`} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="host-player-list">
        {players.map((p) => {
          const task = step.type === "code" ? p.tasks[step.taskId] : undefined;
          return (
            <div key={p.id} className="host-player">
              <span className="dot" style={{ background: p.connected ? "var(--hp)" : "var(--muted)" }} />
              <span className="mono muted" style={{ width: 30 }}>#{rank.get(p.id)}</span>
              <span className="host-player-name" title={p.name}>{p.name}</span>
              {step.type === "quiz" && <span title="answered">{p.answered ? "✅" : "⌛"}</span>}
              {task && (
                <span className="mono" style={{ color: task.passed === task.total ? "var(--hp)" : "var(--muted)" }}>
                  {task.passed}/{task.total}
                </span>
              )}
              {p.submitted && <span title="fighter submitted">⚔️</span>}
              {p.streak >= 2 && <span title="streak">🔥{p.streak}</span>}
              <span className="mono" style={{ width: 60, textAlign: "right" }}>{p.score}</span>
              <button
                className="host-x"
                title="Rename"
                onClick={() => {
                  const name = prompt(`Rename ${p.name} to:`, p.name);
                  if (name) emit("rename", { id: p.id, name });
                }}
              >
                ✎
              </button>
              <button
                className="host-x"
                title="Kick"
                onClick={() => {
                  if (confirm(`Kick ${p.name}?`)) emit("kick", p.id);
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
        {view.players.length === 0 && <div className="muted" style={{ padding: 12 }}>Nobody yet. Share the join link!</div>}
      </div>
    </aside>
  );
}
