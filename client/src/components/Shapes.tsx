// Answer tiles use color AND shape (colorblind-friendly).
export const ANSWER_COLORS = ["var(--a0)", "var(--a1)", "var(--a2)", "var(--a3)"];
export const ANSWER_TEXT = ["#fff", "#fff", "#2a1d00", "#fff"];
export const ANSWER_NAMES = ["Triangle", "Diamond", "Circle", "Square"];

export function AnswerShape({ index, size = 32, color = "currentColor" }: { index: number; size?: number; color?: string }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" aria-label={ANSWER_NAMES[index]} style={{ flex: "none" }}>
      {index === 0 && <polygon points="10,2 19,18 1,18" fill={color} />}
      {index === 1 && <polygon points="10,1 19,10 10,19 1,10" fill={color} />}
      {index === 2 && <circle cx="10" cy="10" r="8.5" fill={color} />}
      {index === 3 && <rect x="2.5" y="2.5" width="15" height="15" rx="1.5" fill={color} />}
    </svg>
  );
}
