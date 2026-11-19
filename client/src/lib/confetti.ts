import confetti from "canvas-confetti";

const COLORS = ["#ffcc4d", "#4cc9f0", "#b18cff", "#3ddc84", "#ff4d5e", "#ff9f43"];

let enabled = true;
/** The host page embeds projector views as a preview; it turns confetti off. */
export function setConfettiEnabled(on: boolean) {
  enabled = on;
}

export function burst({ x = 0.5, y = 0.5, count = 120 }: { x?: number; y?: number; count?: number } = {}) {
  if (!enabled) return;
  void confetti({
    particleCount: count,
    spread: 80,
    startVelocity: 45,
    origin: { x, y },
    colors: COLORS,
    disableForReducedMotion: true,
    scalar: 1.2,
  });
}

export function cannons() {
  if (!enabled) return;
  const end = Date.now() + 1800;
  const frame = () => {
    void confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors: COLORS, disableForReducedMotion: true });
    void confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors: COLORS, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
