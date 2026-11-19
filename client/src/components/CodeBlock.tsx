import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import { useMemo } from "react";

hljs.registerLanguage("python", python);

export interface CodeMark {
  lines: [number, number]; // 1-based, inclusive
  label?: string; // badge shown at the start line (e.g. "1")
  active?: boolean; // strong highlight
}

const LINE_HEIGHT = 1.4;

export function CodeBlock({
  code,
  size = 32,
  style,
  marks,
  accent = "var(--gold)",
}: {
  code: string;
  size?: number;
  style?: React.CSSProperties;
  marks?: CodeMark[];
  accent?: string;
}) {
  const html = useMemo(() => hljs.highlight(code, { language: "python" }).value, [code]);
  const padY = size * 0.7;
  const padX = size * 0.9;
  const lineH = size * LINE_HEIGHT;
  const anyActive = marks?.some((m) => m.active);
  return (
    <pre
      className="mono"
      style={{
        position: "relative",
        margin: 0,
        background: "var(--code-bg)",
        color: "var(--code-text)",
        borderRadius: 18,
        padding: `${padY}px ${padX}px`,
        fontSize: size,
        lineHeight: LINE_HEIGHT,
        border: "2px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.35)",
        overflow: "auto",
        whiteSpace: "pre",
        ...style,
      }}
    >
      {marks?.map((m, i) => {
        const top = padY + (m.lines[0] - 1) * lineH;
        const height = (m.lines[1] - m.lines[0] + 1) * lineH;
        const strong = m.active;
        if (anyActive && !strong && !m.label) return null;
        return (
          <span
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top,
              height,
              background: strong ? `color-mix(in srgb, ${accent} 22%, transparent)` : anyActive ? "transparent" : `color-mix(in srgb, ${accent} 7%, transparent)`,
              borderLeft: `${Math.max(4, size * 0.18)}px solid ${strong || !anyActive ? accent : "transparent"}`,
              transition: "background 0.35s, top 0.35s, height 0.35s",
              pointerEvents: "none",
            }}
          >
            {m.label && (
              <span
                style={{
                  position: "absolute",
                  right: size * 0.4,
                  top: (lineH - size * 1.1) / 2,
                  minWidth: size * 1.1,
                  height: size * 1.1,
                  borderRadius: size * 0.55,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-body)",
                  fontWeight: 800,
                  fontSize: size * 0.62,
                  color: strong || !anyActive ? "var(--bg-deep)" : "var(--muted)",
                  background: strong || !anyActive ? accent : "var(--panel-2)",
                  transition: "all 0.35s",
                }}
              >
                {m.label}
              </span>
            )}
          </span>
        );
      })}
      <code className="hljs" style={{ position: "relative" }} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
