import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A fixed 1920×1080 canvas scaled to fit its parent. Font sizes inside are
 * authored for 1080p so projector minimums hold on any screen.
 */
export function Stage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / 1920, el.clientHeight / 1080));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrap} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#000" }}>
      <div
        className={`stage arena-bg ${className}`}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1920,
          height: 1080,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
