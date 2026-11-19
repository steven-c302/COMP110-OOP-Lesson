// "/": the student's laptop. Join, then follow along with whatever the host shows.
import { useEffect, useRef, useState } from "react";
import { PILLARS, type QuizStep, type StudentView } from "../../../shared/types.ts";
import { useStudent, useTick } from "../lib/socket.ts";
import { randomName } from "../lib/names.ts";
import { py, usePyStatus } from "../lib/python.ts";
import { Sprite, avatarSprite } from "../components/Sprite.tsx";
import { CodeBlock } from "../components/CodeBlock.tsx";
import { ChoiceCard, voteShares } from "../components/Shapes.tsx";
import { CodeTask } from "../components/student/CodeTask.tsx";
import { CountUp } from "../components/screen/ScreenBoards.tsx";
import { Logo, renderInlineCode } from "../components/screen/ScreenBasics.tsx";
import "../styles/student.css";

export default function Play() {
  const { view, status, join, emit, now } = useStudent();
  useTick(250);

  // Preload Python while students wait in the lobby (≈6 MB, once)
  useEffect(() => {
    void py.warm().catch(() => {});
  }, []);

  if (status === "kicked") {
    return (
      <Center>
        <Logo size={56} />
        <p style={{ fontSize: 20 }}>You were removed from this session by the host.</p>
        <button className="btn" onClick={() => location.reload()}>Join again</button>
      </Center>
    );
  }
  if (status === "need_join") return <JoinForm onJoin={join} />;
  if (!view) {
    return (
      <Center>
        <Logo size={56} />
        <p className="muted">{status === "offline" ? "Can't reach the server. Retrying…" : "Connecting…"}</p>
      </Center>
    );
  }
  return <Game view={view} emit={emit} now={now()} offline={status === "offline"} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="arena-bg" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 16, textAlign: "center" }}>
      {children}
    </div>
  );
}

// ------------------------------------------------------------ join
function JoinForm({ onJoin }: { onJoin: (name: string) => Promise<string | null> }) {
  const [name, setName] = useState(randomName);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pyStatus = usePyStatus();
  return (
    <Center>
      <Logo size={64} />
      <form
        className="card join-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(await onJoin(name));
          setBusy(false);
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Sprite sprite={avatarSprite(name)} seed={name} size={72} className="anim-bob" />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 20 }}>Pick your arena name</div>
            <div className="muted" style={{ fontSize: 14 }}>Shown on the big screen. Keep it classy!</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="join-input"
            value={name}
            maxLength={18}
            aria-label="Nickname"
            onChange={(e) => {
              setEdited(true);
              setName(e.target.value);
            }}
            // While the random suggestion is untouched, keep it selected so typing replaces it
            // (otherwise "Iron Unicorn" + typing "Sam" becomes "Iron UnicornSam").
            onPointerDown={(e) => {
              if (edited) return;
              e.preventDefault();
              e.currentTarget.focus();
              e.currentTarget.select();
            }}
            onFocus={(e) => {
              if (!edited) e.currentTarget.select();
            }}
          />
          <button
            type="button"
            className="btn"
            title="Random name"
            onClick={() => {
              setEdited(false);
              setName(randomName());
            }}
          >
            🎲
          </button>
        </div>
        {error && <div style={{ color: "var(--dmg)", fontWeight: 700 }}>{error}</div>}
        <button className="btn btn-gold" style={{ fontSize: 20 }} disabled={busy || name.trim().length < 2}>
          {busy ? "Joining…" : "Enter the Arena ⚔️"}
        </button>
        <div className="muted" style={{ fontSize: 13 }}>
          {pyStatus === "ready" ? "🐍 Python is ready on this laptop" : "🐍 Warming up Python in the background…"}
        </div>
      </form>
    </Center>
  );
}

// ------------------------------------------------------------ game shell
function Game({ view, emit, now, offline }: { view: StudentView; emit: ReturnType<typeof useStudent>["emit"]; now: number; offline: boolean }) {
  const step = view.step;
  const pyStatus = usePyStatus();
  const wide = step.type === "code";
  return (
    <div className="play arena-bg">
      <header className="play-top">
        <Sprite sprite={avatarSprite(view.me.name)} seed={view.me.name} size={40} />
        <div className="play-name">{view.me.name}</div>
        <div style={{ flex: 1 }} />
        {view.me.streak >= 2 && <span className="chip streak">🔥 {view.me.streak}</span>}
        <span className="chip">
          #{view.me.rank} <span className="muted">of {view.me.of}</span>
        </span>
        <span className="chip score">
          <CountUp value={view.me.score} /> pts
        </span>
        <span className="chip py" title="Python in your browser">
          🐍 {pyStatus === "ready" ? "ready" : pyStatus === "error" ? "error" : "loading"}
        </span>
      </header>
      {offline && <div className="play-offline">Reconnecting… your score is safe.</div>}
      <main className={`play-main ${wide ? "wide" : ""}`}>
        {step.type === "lobby" && <Lobby view={view} />}
        {step.type === "slide" && (step.layout === "walkthrough" && step.code ? <Walkthrough key={step.id} view={view} /> : <EyesUp view={view} />)}
        {step.type === "quiz" && view.quiz && <Quiz key={step.id} step={step} view={view} emit={emit} now={now} />}
        {step.type === "code" && <CodeTask key={step.id} step={step} view={view} emit={emit} />}
        {step.type === "leaderboard" && <MyRank view={view} />}
        {step.type === "tournament" && <MyTournament view={view} emit={emit} />}
        {step.type === "podium" && <Recap view={view} />}
      </main>
    </div>
  );
}

function Lobby({ view }: { view: StudentView }) {
  const pyStatus = usePyStatus();
  return (
    <div className="panel center-panel">
      <Sprite sprite={avatarSprite(view.me.name)} seed={view.me.name} size={140} className="anim-bob" />
      <h1 className="pixel" style={{ margin: 0 }}>You're in!</h1>
      <p style={{ fontSize: 20, margin: 0 }}>Look for your name on the big screen 👀</p>
      <div className={`chip ${pyStatus === "ready" ? "ok" : ""}`} style={{ fontSize: 15 }}>
        {pyStatus === "ready" ? "🐍 Python is ready for the coding challenges" : "🐍 Loading Python for the coding challenges…"}
      </div>
    </div>
  );
}

/** Solution walkthrough on the laptop: the code plus the point the TA is on, in sync with the projector. */
function Walkthrough({ view }: { view: StudentView }) {
  const step = view.step;
  if (step.type !== "slide" || !step.code) return null;
  const callouts = step.callouts ?? [];
  const accent = step.pillar ? PILLARS[step.pillar].color : "var(--gold)";
  const marks = callouts.map((c, i) => ({ lines: c.lines, label: String(i + 1), active: view.focus === i + 1 }));
  return (
    <div className="panel walk">
      <div className="muted" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: accent }}>
        {step.kicker ?? "Walkthrough"}
      </div>
      <h2 className="pixel" style={{ margin: "2px 0 10px" }}>{step.title}</h2>
      <CodeBlock code={step.code} size={15} marks={marks} accent={accent} style={{ textAlign: "left", maxWidth: "100%" }} />
      <ol className="walk-points">
        {callouts.map((c, i) => (
          <li key={i} className={view.focus === i + 1 ? "active" : view.focus > 0 ? "dim" : ""} style={{ ["--acc" as string]: accent }}>
            <b>{renderInlineCode(c.title)}</b>
            <span>{renderInlineCode(c.text)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EyesUp({ view }: { view: StudentView }) {
  const step = view.step;
  const [showCode, setShowCode] = useState(false);
  const pillar = step.pillar ? PILLARS[step.pillar] : null;
  const title = step.type === "slide" ? step.title : "";
  const code = step.type === "slide" ? step.code : undefined;
  return (
    <div className="panel center-panel">
      <div style={{ fontSize: 64 }}>👀</div>
      <h2 className="pixel" style={{ margin: 0 }}>Eyes on the big screen</h2>
      <div className="muted">
        {pillar ? `${pillar.glyph} ${pillar.name} · ` : ""}
        {title} · step {view.stepIndex + 1}/{view.stepCount}
      </div>
      {code && (
        <>
          <button className="btn btn-sm" onClick={() => setShowCode((s) => !s)}>
            {showCode ? "Hide code" : "Show the code on my laptop"}
          </button>
          {showCode && <CodeBlock code={code} size={15} style={{ textAlign: "left", maxWidth: "100%" }} />}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ quiz
function Quiz({ step, view, emit, now }: { step: QuizStep; view: StudentView; emit: ReturnType<typeof useStudent>["emit"]; now: number }) {
  const q = view.quiz!;
  const me = view.me;
  const [pending, setPending] = useState<number | null>(null);
  const answered = me.answer ?? pending;
  const open = q.phase === "open" || q.phase === "revote";
  const left = q.endsAt ? Math.max(0, Math.ceil((q.endsAt - now) / 1000)) : 0;
  useEffect(() => setPending(null), [q.round]);
  const pillar = step.pillar ? PILLARS[step.pillar] : null;
  const result = me.lastResult;
  const revealed = q.phase === "revealed";
  const correct = revealed ? (step as QuizStep).correct : undefined;
  const results = q.phase === "closed";
  const showVotes = results || revealed;
  const shares = voteShares(q.round === 2 && q.counts2 ? q.counts2 : q.counts1, step.choices.length);
  const accent = pillar?.color ?? "var(--gold)";

  return (
    <div className="panel quiz">
      <div className="quiz-head">
        <span className="chip" style={{ borderColor: pillar?.color, color: pillar?.color }}>
          {step.label ?? "Question"} {q.round === 2 && "· revote (no points)"}
        </span>
        {(open || q.phase === "reading" || q.phase === "discuss") && q.endsAt > 0 && (
          <span className={`chip timer ${left <= 5 ? "hot" : ""}`}>⏱ {left}s</span>
        )}
      </div>
      <h2 className="quiz-prompt">{renderInlineCode(step.prompt)}</h2>
      {step.code && <CodeBlock code={step.code} size={15} />}

      {q.phase === "reading" && <div className="quiz-wait">📖 Read the question… answers unlock in {left}s</div>}

      {q.phase === "discuss" && (
        <div className="quiz-wait discuss">
          🗣️ <b>Convince your neighbor!</b> Explain why you chose
          {me.answer !== null ? <> <b>{step.choices[me.answer]}</b></> : " your answer"}. You'll vote again in {left}s.
        </div>
      )}

      {(open || q.phase === "closed" || revealed) && (
        <div className="answers">
          {step.choices.map((choice, i) => {
            const mine = answered === i;
            const isCorrect = correct === i;
            return (
              <ChoiceCard
                key={i}
                index={i}
                text={renderInlineCode(choice)}
                accent={accent}
                phase={revealed && step.kind !== "poll" ? "revealed" : showVotes ? "results" : !open || answered !== null ? "locked" : "voting"}
                pct={showVotes ? shares.pct[i] : undefined}
                crowd={showVotes && shares.crowd[i]}
                correct={isCorrect}
                mine={mine}
                tag={mine ? <span className="answer-tag">{revealed && step.kind !== "poll" ? (isCorrect ? "✓ you" : "✗ you") : "you"}</span> : null}
                disabled={!open || answered !== null}
                onClick={() => {
                  setPending(i);
                  emit("answer", { stepId: step.id, choice: i }, (ok) => {
                    if (!ok) setPending(null);
                  });
                }}
              />
            );
          })}
        </div>
      )}

      {open && answered !== null && (
        <div className="quiz-wait">
          Locked in! Waiting for others ({q.answered}/{q.eligible})
        </div>
      )}
      {results && (
        <div className="quiz-wait">
          🗳 That's how the class voted.{" "}
          {step.kind === "poll" ? "" : q.endsAt > 0 ? `Answer in ${Math.max(0, Math.ceil((q.endsAt - now) / 1000))}s…` : "Answer coming up…"}
        </div>
      )}

      {revealed && step.kind !== "poll" && (
        <div className={`result ${result?.correct ? "good" : "bad"} anim-pop`}>
          {result?.correct ? (
            <>
              <div className="result-big">✓ Correct!</div>
              <div className="num" style={{ fontSize: 26 }}>
                +{result.points}
                {result.streakBonus > 0 && <span style={{ fontSize: 18 }}> (incl. 🔥 streak +{result.streakBonus})</span>}
              </div>
            </>
          ) : (
            <div className="result-big">{result?.correct === false ? "✗ Not this time" : "No answer"}</div>
          )}
          {step.explain && <div className="result-explain">💡 {renderInlineCode(step.explain)}</div>}
        </div>
      )}
      {revealed && step.kind === "poll" && <div className="quiz-wait">Thanks for voting! Check the screen 📊</div>}
    </div>
  );
}

// ------------------------------------------------------------ leaderboard
function MyRank({ view }: { view: StudentView }) {
  const me = view.me;
  return (
    <div className="panel center-panel">
      <div className="muted">Your rank</div>
      <div className="num" style={{ fontSize: 80, lineHeight: 1, color: "var(--gold)" }}>
        #{me.rank}
      </div>
      <div className="muted">of {me.of} · {me.score.toLocaleString()} pts</div>
      <div className="neighbors">
        {me.neighbors.map((r) => (
          <div key={r.id} className={`neighbor ${r.id === me.id ? "me" : ""}`}>
            <span className="mono" style={{ width: 44 }}>#{r.rank}</span>
            <Sprite sprite={avatarSprite(r.name)} seed={r.name} size={28} />
            <span style={{ flex: 1, fontWeight: 700 }}>{r.name}</span>
            <span className="mono">{r.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
      {me.neighbors[0] && me.neighbors[0].id !== me.id && (
        <div className="muted" style={{ fontSize: 14 }}>
          {(() => {
            const above = me.neighbors[me.neighbors.findIndex((n) => n.id === me.id) - 1];
            return above ? `${(above.score - me.score).toLocaleString()} pts to pass ${above.name}. The tournament can flip everything!` : "";
          })()}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ tournament
function MyTournament({ view, emit }: { view: StudentView; emit: ReturnType<typeof useStudent>["emit"] }) {
  const t = view.tournament;
  const [cheered, setCheered] = useState<[number, number]>([0, 0]);
  const lastMatch = useRef<string>("");
  const matchKey = t?.currentMatch ? `${t.currentMatch.a}|${t.currentMatch.b}` : "";
  useEffect(() => {
    if (matchKey !== lastMatch.current) {
      lastMatch.current = matchKey;
      setCheered([0, 0]);
    }
  }, [matchKey]);
  if (!t) return null;
  const f = t.myFighter;
  return (
    <div className="panel center-panel">
      {t.status === "idle" && (
        <>
          <div style={{ fontSize: 56 }}>⚔️</div>
          <h2 className="pixel" style={{ margin: 0 }}>The tournament is about to begin</h2>
          <p className="muted">{view.me.submitted ? "Your fighter is entered." : "No fighter submitted, so you'll fight as a Rookie!"}</p>
        </>
      )}
      {t.status === "computing" && <h2 className="pixel">Forging the bracket…</h2>}
      {f && (
        <div className="fighter-card">
          <Sprite sprite={f.sprite} seed={f.player} size={110} className="anim-bob" />
          <div style={{ textAlign: "left" }}>
            <div className="pixel" style={{ fontSize: 26 }}>{f.name}</div>
            <div className="mono muted" style={{ fontSize: 13 }}>class {f.cls}(Fighter)</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              ❤️ {f.maxHp} · ⚔️ {f.power} · 🛡️ {f.defense} · ⚡ {f.speed}
            </div>
            <div style={{ fontStyle: "italic", marginTop: 4 }}>“{f.cry}”</div>
          </div>
        </div>
      )}
      {t.myMatches.length > 0 && (
        <div className="path">
          {t.myMatches.map((m, i) => (
            <div key={i} className={`path-row ${m.won === true ? "won" : m.won === false ? "lost" : ""}`}>
              <span className="mono">R{m.round + 1}</span>
              <span style={{ flex: 1 }}>{m.opponent ? `vs ${m.opponent}` : "vs ???"}</span>
              <span>{m.won === null ? "⏳" : m.won ? "🏆 WIN" : "✗"}</span>
            </div>
          ))}
        </div>
      )}
      {t.eliminated && t.status === "playing" && <div className="muted">Knocked out, but you can still cheer! 📣</div>}
      {t.currentMatch && (
        <div className="cheer">
          <div className="muted" style={{ fontSize: 14 }}>Now fighting · tap to cheer!</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[t.currentMatch.a, t.currentMatch.b].map((name, side) => (
              <button
                key={side}
                className="btn cheer-btn"
                style={{ borderColor: side === 0 ? "var(--cyan)" : "var(--magic)" }}
                onClick={() => {
                  emit("cheer", side);
                  setCheered((c) => (side === 0 ? [c[0] + 1, c[1]] : [c[0], c[1] + 1]));
                }}
              >
                📣 {name} {cheered[side] > 0 && <span className="muted">×{cheered[side]}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {t.status === "done" && t.champion && (
        <div className="chip" style={{ fontSize: 18, padding: "10px 16px", color: "var(--gold)" }}>
          👑 Champion: {t.champion}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ podium recap
function Recap({ view }: { view: StudentView }) {
  const me = view.me;
  const t = view.tournament;
  const tasks = Object.values(me.tasks);
  const passed = tasks.reduce((n, r) => n + r.passed, 0);
  const total = tasks.reduce((n, r) => n + r.total, 0);
  const wins = t?.myMatches.filter((m) => m.won === true).length ?? 0;
  const losses = t?.myMatches.filter((m) => m.won === false).length ?? 0;
  const onPodium = view.podium?.some((r) => r.id === me.id);
  return (
    <div className="panel center-panel">
      <div style={{ fontSize: 56 }}>{onPodium ? "🥇" : "🎓"}</div>
      <h2 className="pixel" style={{ margin: 0 }}>{onPodium ? "You made the podium!" : "Great session!"}</h2>
      <div className="recap">
        <Stat label="Final rank" value={`#${me.rank} / ${me.of}`} />
        <Stat label="Points" value={me.score.toLocaleString()} />
        <Stat label="Best streak" value={`🔥 ${me.bestStreak}`} />
        <Stat label="Checks passed" value={`${passed}/${total}`} />
        <Stat label="Fighter record" value={`${wins}–${losses}`} />
      </div>
      <div className="muted" style={{ maxWidth: 520 }}>
        You used all four pillars today: <b>encapsulation</b> (private _hp), <b>abstraction</b> (Fighter ABC), <b>inheritance</b> (super().__init__) and{" "}
        <b>polymorphism</b> (the arena calling your choose_move()).
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="muted" style={{ fontSize: 13 }}>{label}</div>
      <div className="num" style={{ fontSize: 26 }}>{value}</div>
    </div>
  );
}
