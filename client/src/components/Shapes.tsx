// Quiz answer options: dark "move cards" with a lettered key, tinted by the pillar's color.
// One accent per question (not a color per answer), and a vote bar that fills in once
// voting closes. Letters (not colors) identify answers, so it's colorblind-safe.
import type { CSSProperties, ReactNode } from "react";

export const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type ChoicePhase = "voting" | "locked" | "results" | "revealed";

interface ChoiceProps {
  index: number;
  text: ReactNode;
  accent: string;
  phase: ChoicePhase;
  /** share of votes 0-100 (results/revealed) */
  pct?: number;
  count?: number;
  /** first-vote share, drawn as a tick on the bar after a revote */
  beforePct?: number;
  correct?: boolean;
  mine?: boolean;
  crowd?: boolean;
  big?: boolean;
  compact?: boolean;
  tag?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function ChoiceCard(p: ChoiceProps) {
  const showBar = p.phase === "results" || p.phase === "revealed";
  const revealed = p.phase === "revealed";
  const cls = [
    "choice",
    p.big ? "big" : "",
    p.compact ? "compact" : "",
    p.mine ? "mine" : "",
    revealed && p.correct ? "correct" : "",
    revealed && !p.correct ? "dim" : "",
    p.phase === "locked" && !p.mine ? "dim" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = {
    "--acc": p.accent,
    "--pct": `${p.pct ?? 0}%`,
    "--delay": `${p.index * 0.1}s`,
    ...(p.beforePct !== undefined ? { "--before": `${p.beforePct}%` } : {}),
  } as CSSProperties;

  const body = (
    <>
      <span className="choice-key">
        {revealed && p.correct ? "✓" : LETTERS[p.index]}
      </span>
      <span className="choice-text">{p.text}</span>
      <span className="choice-side">
        {p.tag}
        {showBar && (
          <span className="num choice-pct">
            {p.pct ?? 0}
            <small>%</small>
          </span>
        )}
      </span>
      {showBar && (
        <span className="choice-bar" aria-hidden>
          <i />
          {p.beforePct !== undefined && <b title="first vote" />}
        </span>
      )}
      {showBar && p.crowd && !revealed && <span className="choice-crowd">most picked</span>}
    </>
  );

  if (p.onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={p.onClick} disabled={p.disabled}>
        {body}
      </button>
    );
  }
  return (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

/** Percentages that add up sensibly, plus which option(s) the crowd picked most. */
export function voteShares(counts: number[] | undefined, n: number) {
  const c = Array.from({ length: n }, (_, i) => counts?.[i] ?? 0);
  const total = c.reduce((a, b) => a + b, 0);
  const max = Math.max(0, ...c);
  return {
    total,
    counts: c,
    pct: c.map((v) => (total ? Math.round((100 * v) / total) : 0)),
    crowd: c.map((v) => max > 0 && v === max),
  };
}
