import { useEffect, useRef } from "react";
import { sfx } from "../lib/sound.ts";

interface Props {
  endsAt: number;
  total: number; // ms
  now: number;
  size?: number;
  sound?: boolean;
}

/** Circular countdown ring: amber then red in the last 5 s, with ticks. */
export function Countdown({ endsAt, total, now, size = 160, sound }: Props) {
  const left = Math.max(0, endsAt - now);
  const secs = Math.ceil(left / 1000);
  const frac = total > 0 ? left / total : 0;
  const last = useRef(secs);
  useEffect(() => {
    if (!sound || secs === last.current) return;
    last.current = secs;
    if (secs > 0 && secs <= 5) sfx("tickHi");
    else if (secs > 0 && secs <= 10) sfx("tick");
  }, [secs, sound]);
  const label = secs >= 100 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : String(secs);
  const color = secs <= 5 ? "var(--dmg)" : secs <= 10 ? "var(--amber)" : "var(--gold)";
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }} className={secs <= 5 && left > 0 ? "anim-pulse" : ""}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="9" fill="rgba(0,0,0,0.25)" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={color}
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.3s" }}
        />
      </svg>
      <div
        className="num"
        style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: size * (label.length > 3 ? 0.27 : 0.36), fontWeight: 700, color }}
      >
        {label}
      </div>
    </div>
  );
}
