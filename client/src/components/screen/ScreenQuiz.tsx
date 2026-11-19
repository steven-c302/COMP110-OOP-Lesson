import { useEffect, useRef } from "react";
import { PILLARS, type QuizState, type QuizStep } from "../../../../shared/types.ts";
import { CodeBlock } from "../CodeBlock.tsx";
import { Countdown } from "../Countdown.tsx";
import { ANSWER_COLORS, ANSWER_TEXT, AnswerShape } from "../Shapes.tsx";
import { sfx } from "../../lib/sound.ts";
import { codeSize, renderInlineCode } from "./ScreenBasics.tsx";
import { burst } from "../../lib/confetti.ts";

interface Props {
  step: QuizStep;
  quiz: QuizState;
  now: number;
  sound: boolean;
}

export function ScreenQuiz({ step, quiz, now, sound }: Props) {
  const accent = step.pillar ? PILLARS[step.pillar].color : "var(--gold)";
  const phase = quiz.phase;
  const revealed = phase === "revealed";
  const open = phase === "open" || phase === "revote";
  const prevPhase = useRef(phase);

  useEffect(() => {
    if (!sound || prevPhase.current === phase) return;
    const from = prevPhase.current;
    prevPhase.current = phase;
    if (phase === "open" || phase === "revote") sfx("whoosh");
    if (phase === "closed" && (from === "open" || from === "revote")) sfx("gong");
    if (phase === "revealed") {
      sfx("reveal");
      setTimeout(() => {
        sfx(step.kind === "poll" ? "coin" : "correct");
        if (step.kind !== "poll") burst({ y: 0.35, count: 90 });
      }, 1000);
    }
  }, [phase, sound, step.kind]);

  const counts = quiz.hadRevote ? quiz.counts2 ?? [] : quiz.counts1 ?? [];
  const before = quiz.hadRevote ? quiz.counts1 ?? [] : null;
  const total = Math.max(1, counts.reduce((a, b) => a + b, 0));
  const totalBefore = before ? Math.max(1, before.reduce((a, b) => a + b, 0)) : 1;
  const hasCode = !!step.code;

  return (
    <div style={{ position: "absolute", inset: 0, padding: "120px 80px 60px", display: "flex", flexDirection: "column", gap: 30 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 30 }}>
        <div style={{ flex: 1 }}>
          <div className="chip pixel" style={{ fontSize: 28, padding: "8px 20px", borderColor: accent, color: accent, marginBottom: 18 }}>
            {step.label ?? (step.kind === "poll" ? "Poll" : "Question")}
            {quiz.round === 2 && " · REVOTE (no points)"}
          </div>
          <div style={{ fontSize: step.prompt.length > 70 ? 50 : 60, fontWeight: 700, lineHeight: 1.2 }}>{renderInlineCode(step.prompt)}</div>
        </div>
        {(open || phase === "discuss" || phase === "reading") && quiz.endsAt > 0 && (
          <Countdown
            endsAt={quiz.endsAt}
            total={phase === "reading" ? (step.readSeconds ?? 4) * 1000 : phase === "discuss" ? 60_000 : step.seconds * 1000}
            now={now}
            size={170}
            sound={sound && open}
          />
        )}
      </div>

      {/* body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: hasCode ? "minmax(0, 1fr) 820px" : "1fr", gap: 40, minHeight: 0 }}>
        {hasCode && (
          <div style={{ display: "flex", alignItems: "flex-start", minWidth: 0 }}>
            <CodeBlock code={step.code!} size={codeSize(step.code!, 900, 13, 600)} style={{ width: "100%", maxHeight: "100%" }} />
          </div>
        )}

        {phase === "reading" ? (
          <div style={{ display: "grid", placeItems: "center", fontSize: 54, color: "var(--muted)" }} className="pixel">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 110 }}>📖</div>
              Read carefully…
            </div>
          </div>
        ) : phase === "discuss" ? (
          <div className="card anim-pop" style={{ display: "grid", placeItems: "center", textAlign: "center", padding: 40, borderColor: "var(--magic)" }}>
            <div>
              <div style={{ fontSize: 130 }}>🗣️</div>
              <div className="pixel" style={{ fontSize: 76, fontWeight: 700, color: "var(--magic)" }}>Convince your neighbor!</div>
              <div style={{ fontSize: 40, marginTop: 16, color: "var(--muted)" }}>
                Explain WHY you picked your answer. Then you'll vote again.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: hasCode ? "1fr" : "1fr 1fr", gap: hasCode ? 18 : 26, alignContent: "start" }}>
            {step.choices.map((choice, i) => {
              const isCorrect = revealed && quiz.correct === i;
              const dim = revealed && quiz.correct !== undefined && quiz.correct !== i;
              const pct = revealed ? Math.round((100 * (counts[i] ?? 0)) / total) : 0;
              const pctBefore = before ? Math.round((100 * (before[i] ?? 0)) / totalBefore) : 0;
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    gap: 22,
                    padding: hasCode ? "20px 26px" : "34px 34px",
                    minHeight: hasCode ? 110 : 150,
                    borderRadius: 20,
                    background: ANSWER_COLORS[i],
                    color: ANSWER_TEXT[i],
                    fontSize: choice.length > 34 ? 32 : 40,
                    fontWeight: 700,
                    opacity: dim ? 0.35 : phase === "closed" ? 0.75 : 1,
                    boxShadow: isCorrect ? "0 0 0 6px #fff, 0 0 60px 10px rgba(255,255,255,0.6)" : "0 8px 0 rgba(0,0,0,0.35)",
                    transform: isCorrect ? "scale(1.03)" : "none",
                    transition: "all 0.5s 0.9s",
                  }}
                >
                  {revealed && (
                    <>
                      {before && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            bottom: 0,
                            height: 10,
                            width: `${pctBefore}%`,
                            background: "rgba(0,0,0,0.45)",
                          }}
                          title="First vote"
                        />
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${pct}%`,
                          background: "rgba(255,255,255,0.22)",
                          transformOrigin: "left",
                          animation: `grow-x 0.6s ${i * 0.12}s cubic-bezier(.2,.9,.3,1) both`,
                        }}
                      />
                    </>
                  )}
                  <AnswerShape index={i} size={hasCode ? 40 : 52} color={ANSWER_TEXT[i]} />
                  <span style={{ position: "relative", flex: 1 }}>{choice}</span>
                  {revealed && (
                    <span className="num" style={{ position: "relative", fontSize: 40, display: "flex", gap: 12, alignItems: "baseline" }}>
                      {before && <span style={{ fontSize: 26, opacity: 0.8 }}>{pctBefore}% →</span>}
                      {counts[i] ?? 0}
                      {isCorrect && <span style={{ fontSize: 48 }}>✓</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 30, minHeight: 70 }}>
        {open && (
          <div className="pixel" style={{ fontSize: 44, fontWeight: 700 }}>
            Answers <span className="num" style={{ color: "var(--gold)" }}>{quiz.answered}</span>
            <span className="muted num"> / {quiz.eligible}</span>
          </div>
        )}
        {phase === "closed" && (
          <div className="pixel" style={{ fontSize: 48, fontWeight: 700, color: "var(--gold)" }}>
            ⏰ Time's up! {quiz.answered} answered
          </div>
        )}
        {revealed && step.explain && (
          <div
            className="card anim-pop"
            style={{ animationDelay: "1.2s", padding: "18px 28px", fontSize: 34, lineHeight: 1.35, borderColor: "var(--hp)", flex: 1 }}
          >
            💡 {renderInlineCode(step.explain)}
          </div>
        )}
        {revealed && before && (
          <div className="chip" style={{ fontSize: 26, padding: "10px 18px" }}>
            dark bar = first vote
          </div>
        )}
      </div>
    </div>
  );
}
