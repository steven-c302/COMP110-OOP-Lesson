// TA speaker notes: the panel on /host and the printable all-steps view (/host?notes=print).
import type { ReactNode } from "react";
import { PILLARS, type SpeakerNotes, type Step } from "../../../shared/types.ts";
import { renderInlineCode } from "./screen/ScreenBasics.tsx";

const SECTIONS: { key: keyof SpeakerNotes; icon: string; label: string }[] = [
  { key: "doNow", icon: "🎛", label: "Do" },
  { key: "say", icon: "🎤", label: "Say" },
  { key: "answer", icon: "✅", label: "Answer" },
  { key: "concept", icon: "💡", label: "Explain" },
  { key: "ask", icon: "❓", label: "Ask the room" },
  { key: "watch", icon: "⚠️", label: "Watch for" },
  { key: "faq", icon: "🙋", label: "If they ask" },
];

// `backticks` mark code in the notes
const text = (s: string): ReactNode =>
  s.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <code key={i} className="sn-code">{part}</code> : part));

export function NotesBody({ notes }: { notes: SpeakerNotes }) {
  return (
    <div className="sn-body">
      {SECTIONS.map(({ key, icon, label }) => {
        const v = notes[key];
        if (!v || (Array.isArray(v) && v.length === 0)) return null;
        let content: ReactNode;
        if (key === "faq") {
          content = (
            <dl className="sn-faq">
              {(v as SpeakerNotes["faq"])!.map((f, i) => (
                <div key={i}>
                  <dt>{text(f.q)}</dt>
                  <dd>{text(f.a)}</dd>
                </div>
              ))}
            </dl>
          );
        } else if (Array.isArray(v)) {
          content = (
            <ul>
              {(v as string[]).map((line, i) => (
                <li key={i}>{text(line)}</li>
              ))}
            </ul>
          );
        } else {
          content = <p>{text(v as string)}</p>;
        }
        return (
          <section key={key} className={`sn-section sn-${key}`}>
            <h4>
              <span aria-hidden>{icon}</span> {label}
            </h4>
            {content}
          </section>
        );
      })}
      {notes.next && (
        <div className="sn-next">
          <b>➡ Next:</b> {text(notes.next)}
        </div>
      )}
    </div>
  );
}

export function SpeakerNotesPanel({ step, nextTitle }: { step: Step; nextTitle?: string }) {
  const notes = step.speaker;
  return (
    <div className="card sn-panel">
      <div className="sn-head">
        <b>🗒 Speaker notes</b>
        <span className="muted" style={{ fontSize: 13 }}>
          Only you see these
        </span>
        <div style={{ flex: 1 }} />
        <a className="btn btn-sm" href="/host?notes=print" target="_blank" rel="noreferrer">
          🖨 All notes
        </a>
      </div>
      {notes ? (
        <NotesBody notes={{ ...notes, next: notes.next ?? nextTitle }} />
      ) : (
        <div className="muted">No notes for this step.{nextTitle && <> Next: {nextTitle}</>}</div>
      )}
    </div>
  );
}

/** Every step's notes on one page, for printing or a second screen. */
export function NotesDocument({ steps, titleOf, minutesOf }: { steps: Step[]; titleOf: (s: Step) => string; minutesOf: (s: Step) => number }) {
  let elapsed = 0;
  return (
    <div className="sn-doc">
      <header className="sn-doc-head">
        <h1>OOP Arena · Speaker notes</h1>
        <button className="btn btn-sm no-print" onClick={() => window.print()}>
          🖨 Print
        </button>
      </header>
      {steps.map((s, i) => {
        const start = elapsed;
        elapsed += minutesOf(s);
        const color = s.pillar ? PILLARS[s.pillar].color : "var(--muted)";
        return (
          <article key={s.id} className="sn-doc-step" style={{ borderLeftColor: color }}>
            <h2>
              <span className="sn-doc-num">{i + 1}</span>
              <span className="sn-doc-time">{Math.floor(start)}′</span>
              <span>{renderInlineCode(titleOf(s))}</span>
              <span className="sn-doc-type">{s.type}</span>
            </h2>
            {s.speaker ? <NotesBody notes={s.speaker} /> : <p className="muted">No notes.</p>}
          </article>
        );
      })}
    </div>
  );
}
