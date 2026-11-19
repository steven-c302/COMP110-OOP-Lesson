import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import { useMemo } from "react";

hljs.registerLanguage("python", python);

export function CodeBlock({ code, size = 32, style }: { code: string; size?: number; style?: React.CSSProperties }) {
  const html = useMemo(() => hljs.highlight(code, { language: "python" }).value, [code]);
  return (
    <pre
      className="mono"
      style={{
        margin: 0,
        background: "var(--code-bg)",
        color: "var(--code-text)",
        borderRadius: 18,
        padding: `${size * 0.7}px ${size * 0.9}px`,
        fontSize: size,
        lineHeight: 1.4,
        border: "2px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.35)",
        overflow: "auto",
        whiteSpace: "pre",
        ...style,
      }}
    >
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
