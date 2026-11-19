import { useEffect, useRef } from "react";
import { PILLARS, type QuizState, type QuizStep } from "../../../../shared/types.ts";
import { CodeBlock } from "../CodeBlock.tsx";
import { Countdown } from "../Countdown.tsx";
import { ChoiceCard, voteShares } from "../Shapes.tsx";
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
    if (phase === "closed" && (from === "open" || from === "revote")) sfx("gong"); // results in
    if (phase === "revealed") {
      sfx("reveal");
      setTimeout(() => {
        sfx(step.kind === "poll" ? "coin" : "correct");
        if (step.kind !== "poll") burst({ y: 0.35, count: 90 });
      }, 1000);
    }
  }, [phase, sound, step.kind]);

  const results = phase === "closed";
  const showVotes = results || revealed;
  // after a revote, show the revote split with the first vote as a tick mark
  const now2 = quiz.round === 2 && quiz.counts2 ? quiz.counts2 : quiz.counts1;
  const shares = voteShares(now2, step.choices.length);
  const before = quiz.round === 2 && quiz.counts2 && quiz.counts1 ? voteShares(quiz.counts1, step.choices.length) : null;
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
          <div style={{ display: "flex", flexDirection: "column", gap: hasCode ? 16 : 22, justifyContent: "flex-start", minWidth: 0 }}>
            {step.choices.map((choice, i) => (
              <ChoiceCard
                key={i}
                index={i}
                text={renderInlineCode(choice)}
                accent={accent}
                big
                compact={hasCode || step.choices.length > 4}
                phase={revealed && step.kind !== "poll" ? "revealed" : showVotes ? "results" : "voting"}
                pct={showVotes ? shares.pct[i] : undefined}
                beforePct={before ? before.pct[i] : undefined}
                crowd={showVotes && shares.crowd[i]}
                correct={quiz.correct === i}
                tag={
                  showVotes ? (
                    <span className="muted num" style={{ fontSize: "0.7em" }}>
                      {shares.counts[i]} {shares.counts[i] === 1 ? "vote" : "votes"}
                    </span>
                  ) : null
                }
              />
            ))}
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
        {results && (
          <div className="pixel anim-pop" style={{ fontSize: 46, fontWeight: 700, color: "var(--gold)", display: "flex", alignItems: "center", gap: 24 }}>
            🗳 How the arena voted
            <span className="muted" style={{ fontSize: 34 }}>
              {step.kind === "poll"
                ? ""
                : quiz.endsAt > 0
                  ? `· answer in ${Math.max(0, Math.ceil((quiz.endsAt - now) / 1000))}…`
                  : "· who's right?"}
            </span>
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
            ▏tick = first vote
          </div>
        )}
      </div>
    </div>
  );
}
