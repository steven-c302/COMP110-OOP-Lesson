// Student coding task: CodeMirror editor + Pyodide test runner + practice battles.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { PILLARS, type BattleLog, type CodeStep, type StudentView } from "../../../../shared/types.ts";
import { TASKS, checklist } from "../../lib/tasks.ts";
import { describeFighter, practice, runTask, usePyStatus, type TaskRun } from "../../lib/python.ts";
import { Sprite } from "../Sprite.tsx";
import { renderInlineCode } from "../screen/ScreenBasics.tsx";
import { pythonEditorExtensions } from "../../lib/editor.ts";

// Keyed by player too, so a new player in the same browser (rehearsal, shared lab machine,
// host Reset) never inherits someone else's finished code.
const saveKey = (playerId: string, taskId: string) => `oop-arena-code-${playerId}-${taskId}`;

function loadLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function initialCode(step: CodeStep, view: StudentView): string {
  const own = loadLocal(saveKey(view.me.id, step.taskId)) ?? view.carryCode[step.taskId];
  if (own) return own;
  if (step.carryFrom) {
    const carried = loadLocal(saveKey(view.me.id, step.carryFrom)) ?? view.carryCode[step.carryFrom];
    if (carried) return carried;
  }
  return TASKS[step.taskId].starter;
}

interface Props {
  step: CodeStep;
  view: StudentView;
  emit: (event: string, payload?: unknown, ack?: (res: unknown) => void) => void;
}

export function CodeTask({ step, view, emit }: Props) {
  const task = TASKS[step.taskId];
  const pillar = PILLARS[step.pillar];
  const [code, setCode] = useState(() => initialCode(step, view));
  const [run, setRun] = useState<TaskRun | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [battles, setBattles] = useState<BattleLog[] | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "done" | string>(view.me.submitted ? "done" : "idle");
  const [openedAt] = useState(() => Date.now());
  const [nowTick, setNowTick] = useState(Date.now());
  const pyStatus = usePyStatus();
  const playerId = view.me.id;
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // autosave locally + to server (so a reload or another laptop can resume)
  useEffect(() => {
    saveLocal(saveKey(playerId, step.taskId), code);
    const t = setTimeout(() => emit("saveCode", { taskId: step.taskId, code }), 1500);
    return () => clearTimeout(t);
  }, [code, step.taskId, playerId, emit]);

  const items = useMemo(() => checklist(task.tests), [task.tests]);
  const allPassed = !!run && !run.error && run.tests.length > 0 && run.tests.every((t) => t.passed);

  const doRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await runTask(codeRef.current, task.tests);
      setRun(res);
      const passed = res.error ? 0 : res.tests.filter((t) => t.passed).length;
      const total = Math.max(res.tests.length, items.length, 1);
      emit("codeResult", {
        stepId: step.id,
        passed,
        total,
        code: codeRef.current,
        tests: res.error ? items.map((name) => ({ name, passed: false })) : res.tests.map((t) => ({ name: t.name, passed: t.passed })),
      });
    } catch (err) {
      setRunError(String((err as Error).message ?? err));
    } finally {
      setRunning(false);
    }
  }, [running, task.tests, emit, step.id, items]);

  const doPractice = async () => {
    setPracticeError(null);
    setBattles(null);
    try {
      const res = await practice(codeRef.current);
      if (res.error) setPracticeError(`${res.error.message}${res.error.hint ? `\n💡 ${res.error.hint}` : ""}`);
      else setBattles(res.battles);
    } catch (err) {
      setPracticeError(String((err as Error).message ?? err));
    }
  };

  const doSubmit = async () => {
    setSubmitState("sending");
    try {
      const res = await describeFighter(codeRef.current);
      if (res.error || !res.card) {
        setSubmitState(res.error?.message ?? "Couldn't read your fighter");
        return;
      }
      emit("submitFighter", { code: codeRef.current, card: res.card }, (err) => setSubmitState(err ? String(err) : "done"));
    } catch (err) {
      setSubmitState(String((err as Error).message ?? err));
    }
  };

  // Ctrl/⌘+Enter runs the tests even when the editor isn't focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !(e.target as HTMLElement)?.closest?.(".cm-editor")) {
        e.preventDefault();
        void doRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doRun]);

  const runKeymap = useMemo(
    () =>
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              void doRun();
              return true;
            },
          },
        ]),
      ),
    [doRun],
  );

  const editorExtensions = useMemo(() => [python(), ...pythonEditorExtensions(), runKeymap], [runKeymap]);

  const secondsOpen = Math.floor((nowTick - openedAt) / 1000);
  const hintUnlocks = [60, 120];
  const errorLine = run?.error?.line ?? null;

  return (
    <div className="task">
      <section className="task-side">
        <div className="pixel" style={{ color: pillar.color, fontSize: 15, letterSpacing: "0.08em" }}>
          {pillar.glyph} {pillar.name.toUpperCase()} · CODE CHALLENGE
        </div>
        <h2 className="pixel" style={{ margin: "4px 0 6px", fontSize: 28 }}>{step.title}</h2>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{renderInlineCode(step.goal)}</p>

        <div className="task-checklist">
          {(run && !run.error ? run.tests.map((t) => t.name) : items).map((name, i) => {
            const result = run && !run.error ? run.tests[i] : null;
            const firstFail = run && !run.error ? run.tests.findIndex((t) => !t.passed) : -1;
            return (
              <div key={name} className={`check ${result ? (result.passed ? "pass" : "fail") : ""}`}>
                <span className="check-icon">{result ? (result.passed ? "✓" : "✗") : "○"}</span>
                <div>
                  <div>{name}</div>
                  {result && !result.passed && i === firstFail && (
                    <div className="check-detail">
                      {result.message}
                      {result.hint && <div className="check-hint">💡 {result.hint}</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="task-hints">
          {step.hints.map((hint, i) => {
            const unlockAt = hintUnlocks[i] ?? 120;
            const unlocked = secondsOpen >= unlockAt;
            return (
              <details key={i} className="hint" open={false}>
                <summary>
                  {unlocked ? `💡 Hint ${i + 1}` : `🔒 Hint ${i + 1} unlocks in ${unlockAt - secondsOpen}s`}
                </summary>
                {unlocked && <pre className="mono">{hint}</pre>}
              </details>
            );
          })}
        </div>
      </section>

      <section className="task-main">
        <div className="task-editor">
          <CodeMirror
            value={code}
            onChange={setCode}
            theme="dark"
            height="100%"
            extensions={editorExtensions}
            basicSetup={{ highlightActiveLine: true, foldGutter: false, autocompletion: true, tabSize: 4, indentOnInput: true }}
            style={{ height: "100%", fontSize: 15 }}
          />
        </div>

        <div className="task-actions">
          <button className="btn btn-green" onClick={doRun} disabled={running || pyStatus === "error"}>
            {running ? "⏳ Running…" : pyStatus === "loading" || pyStatus === "idle" ? "🐍 Loading Python…" : "▶ Run tests"}
            <span className="kbd">⌘/Ctrl+Enter</span>
          </button>
          {task.practice && (
            <button className="btn" onClick={doPractice} disabled={running}>
              ⚔️ Practice battle
            </button>
          )}
          {step.submitFighter && (
            <button
              className={`btn ${allPassed ? "btn-gold" : ""}`}
              onClick={doSubmit}
              disabled={!allPassed || view.submissionsLocked || submitState === "sending"}
              title={allPassed ? "" : "Pass every check first"}
            >
              🏟 {submitState === "done" ? "Update my fighter" : "Submit to Arena"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              if (confirm("Reset to the starter code? Your changes will be lost.")) setCode(TASKS[step.taskId].starter);
            }}
          >
            ↺ Reset
          </button>
        </div>

        {step.submitFighter && submitState !== "idle" && (
          <div className={`task-banner ${submitState === "done" ? "ok" : submitState === "sending" ? "" : "bad"}`}>
            {submitState === "done"
              ? "⚔️ Your fighter is in the arena! You can keep improving it and press Update until the host locks submissions."
              : submitState === "sending"
                ? "Sending…"
                : `Couldn't submit: ${submitState}`}
          </div>
        )}
        {view.submissionsLocked && step.submitFighter && <div className="task-banner">🔒 Submissions are locked: the tournament is about to start!</div>}

        <div className="task-output">
          {pyStatus === "error" && <div className="out-error">Python failed to load. Check your internet connection and refresh the page.</div>}
          {runError && <div className="out-error">⏱ {runError}</div>}
          {run?.error && (
            <div className="out-error">
              <div className="mono">{run.error.message}</div>
              {run.error.hint && <div className="out-hint">💡 {run.error.hint}</div>}
              {errorLine && <div className="muted" style={{ fontSize: 13 }}>Look at line {errorLine} in your code.</div>}
            </div>
          )}
          {allPassed && <div className="out-ok">🎉 All checks pass! +{1500} points</div>}
          {run && !run.error && !allPassed && (
            <div className="muted">
              {run.tests.filter((t) => t.passed).length} / {run.tests.length} checks passing. You get points for each one.
            </div>
          )}
          {run?.stdout && (
            <details open>
              <summary className="muted">Your print() output</summary>
              <pre className="mono out-stdout">{run.stdout}</pre>
            </details>
          )}
          {practiceError && <pre className="out-error mono" style={{ whiteSpace: "pre-wrap" }}>{practiceError}</pre>}
          {battles && <PracticeResults battles={battles} />}
          {!run && !battles && !runError && (
            <div className="muted">Press ▶ Run tests to check your code. Errors are explained in plain English here.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function PracticeResults({ battles }: { battles: BattleLog[] }) {
  return (
    <div className="practice">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Practice battles vs. the house bots</div>
      {battles.map((b, i) => {
        const me = b.fighters[0];
        const bot = b.fighters[1];
        const won = b.winner === 0;
        const last = b.turns[b.turns.length - 1];
        const crashes = b.turns.filter((t) => t.actor === 0 && t.error);
        return (
          <div key={i} className={`practice-row ${won ? "won" : "lost"}`}>
            <Sprite sprite={me.sprite} size={36} />
            <span style={{ fontWeight: 700 }}>vs</span>
            <Sprite sprite={bot.sprite} size={36} flip />
            <span style={{ flex: 1 }}>
              <b>{bot.name}</b>: {won ? "WIN" : "LOSS"} {b.reason === "ko" ? "by K.O." : "on HP%"} in {b.turns.length} turns
              {last && <span className="muted"> · you ended at {last.hp[0]}/{me.maxHp} HP</span>}
              {crashes.length > 0 && <div style={{ color: "var(--dmg)", fontSize: 13 }}>💥 your code crashed {crashes.length}×: {crashes[0].error}</div>}
            </span>
            <span className="num" style={{ fontSize: 22, color: won ? "var(--hp)" : "var(--dmg)" }}>{won ? "W" : "L"}</span>
          </div>
        );
      })}
      <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
        Tip: tweak your stats and choose_move() and run it again. Every battle has some luck.
      </div>
    </div>
  );
}
