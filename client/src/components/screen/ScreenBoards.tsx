// Projector: code task progress, fighter roster, leaderboard, podium.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PILLARS, type AdminView, type CodeStep, type LeaderRow, type LeaderboardStep } from "../../../../shared/types.ts";
import { Countdown } from "../Countdown.tsx";
import { Sprite, avatarSprite } from "../Sprite.tsx";
import { sfx } from "../../lib/sound.ts";
import { burst, cannons } from "../../lib/confetti.ts";
import { renderInlineCode } from "./ScreenBasics.tsx";

// ------------------------------------------------------------ code task
export function ScreenCode({ step, view, now, sound }: { step: CodeStep; view: AdminView; now: number; sound: boolean }) {
  const pillar = PILLARS[step.pillar];
  const stats = view.code;
  const players = Math.max(1, stats?.players ?? view.players.length);
  const passed = stats?.allPassed ?? 0;
  const startedAt = stats?.startedAt ?? now;
  const endsAt = startedAt + step.seconds * 1000;
  const recent = stats?.recentPasses ?? [];
  const prevRecent = useRef(recent[0]);
  useEffect(() => {
    if (sound && recent[0] && recent[0] !== prevRecent.current) sfx("coin");
    prevRecent.current = recent[0];
  }, [recent, sound]);
  const subs = view.submissions;
  const subTier = subs.length <= 12 ? 0 : subs.length <= 36 ? 1 : 2;
  const prevSubs = useRef(subs.length);
  useEffect(() => {
    if (sound && subs.length > prevSubs.current) sfx("slam");
    prevSubs.current = subs.length;
  }, [subs.length, sound]);

  return (
    <div style={{ position: "absolute", inset: 0, padding: "120px 80px 60px", display: "flex", flexDirection: "column", gap: 36 }}>
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        <div style={{ fontSize: 110 }}>💻</div>
        <div style={{ flex: 1 }}>
          <div className="pixel" style={{ fontSize: 34, color: pillar.color, letterSpacing: "0.08em" }}>
            CODE CHALLENGE · {pillar.name.toUpperCase()}
          </div>
          <div className="pixel" style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>{step.title}</div>
          <div style={{ fontSize: 36, marginTop: 10, maxWidth: 1300, lineHeight: 1.3 }}>{renderInlineCode(step.goal)}</div>
        </div>
        <Countdown endsAt={endsAt} total={step.seconds * 1000} now={now} size={190} sound={sound} />
      </div>

      <div className="card" style={{ padding: "26px 34px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 700, marginBottom: 14 }}>
          <span>All tests passing</span>
          <span className="num" style={{ color: "var(--hp)" }}>
            {passed} / {players}
          </span>
        </div>
        <div style={{ height: 34, background: "rgba(0,0,0,0.35)", borderRadius: 999, overflow: "hidden", border: "2px solid var(--line)" }}>
          <div
            style={{
              height: "100%",
              width: `${(100 * passed) / players}%`,
              background: "linear-gradient(90deg, #22a35a, var(--hp))",
              transition: "width 0.6s cubic-bezier(.2,.9,.3,1)",
              boxShadow: "0 0 24px rgba(61,220,132,0.6)",
            }}
          />
        </div>
      </div>

      {step.submitFighter ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="pixel" style={{ fontSize: 44, fontWeight: 700 }}>
            ⚔️ Fighters entering the arena: <span style={{ color: "var(--gold)" }}>{subs.length}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: subTier === 0 ? 16 : 10, alignContent: "flex-start", overflow: "hidden" }}>
            {subs.map((s) => (
              <div
                key={s.id}
                className="card anim-pop"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: ["10px 20px 10px 10px", "6px 14px 6px 8px", "4px 10px 4px 6px"][subTier], borderRadius: 14 }}
              >
                <Sprite sprite={s.sprite} seed={s.player} size={[64, 40, 30][subTier]} />
                <div>
                  <div style={{ fontSize: [28, 21, 17][subTier], fontWeight: 700 }}>{s.name}</div>
                  {subTier < 2 && (
                    <div className="mono muted" style={{ fontSize: subTier === 0 ? 20 : 15 }}>
                      class {s.cls}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", gap: 16, flexWrap: "wrap", alignContent: "flex-start" }}>
          {recent.length === 0 && <div style={{ fontSize: 36, color: "var(--muted)" }}>First to pass every test gets a shout-out…</div>}
          {recent.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="chip anim-pop"
              style={{ fontSize: 32, padding: "12px 22px", borderColor: "var(--hp)", opacity: 1 - i * 0.06 }}
            >
              🎉 {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ leaderboard
export function ScreenLeaderboard({ step, view, sound }: { step: LeaderboardStep; view: AdminView; sound: boolean }) {
  const board = view.leaderboard;
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    const t = setTimeout(() => {
      setSettled(true);
      if (sound) sfx("whoosh");
    }, 900);
    return () => clearTimeout(t);
  }, [step.id, sound]);
  // Start in the previous order, then animate into the new one.
  const ordered = settled
    ? board.slice(0, 5)
    : [...board]
        .sort((a, b) => (a.prevRank ?? 999) - (b.prevRank ?? 999))
        .slice(0, 5);
  return (
    <div style={{ position: "absolute", inset: 0, padding: "120px 160px 60px", display: "flex", flexDirection: "column", gap: 30 }}>
      <div className="pixel" style={{ fontSize: 90, fontWeight: 700, textAlign: "center", color: "var(--gold)" }}>
        🏆 {step.title ?? "Leaderboard"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <AnimatePresence>
          {ordered.map((row, i) => (
            <motion.div
              layout
              key={row.id}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26, delay: settled ? 0 : i * 0.08 }}
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 30,
                padding: "18px 36px",
                fontSize: 48,
                fontWeight: 700,
                borderColor: i === 0 && settled ? "var(--gold)" : "var(--line)",
                background: i === 0 && settled ? "linear-gradient(90deg, rgba(255,204,77,0.25), var(--panel))" : "var(--panel)",
              }}
            >
              <div className="num" style={{ width: 90, color: "var(--gold)" }}>
                #{settled ? row.rank : row.prevRank ?? "–"}
              </div>
              <Sprite sprite={avatarSprite(row.name)} seed={row.name} size={70} />
              <div style={{ flex: 1 }}>{row.name}</div>
              <CountUp value={row.score} className="num" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {view.climbers.length > 0 && (
        <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
          <span className="pixel" style={{ fontSize: 36, color: "var(--hp)" }}>⬆ Biggest climbers</span>
          {view.climbers.map((c) => (
            <span key={c.id} className="chip anim-pop" style={{ fontSize: 30, padding: "10px 20px", borderColor: "var(--hp)" }}>
              {c.name} <span style={{ color: "var(--hp)" }}>+{(c.prevRank ?? c.rank) - c.rank}</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ textAlign: "center", fontSize: 30, color: "var(--muted)" }}>Your exact rank is on your laptop 👀</div>
    </div>
  );
}

export function CountUp({ value, className, duration = 900 }: { value: number; className?: string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className}>{shown.toLocaleString()}</span>;
}

// ------------------------------------------------------------ podium
export function ScreenPodium({ view, sound, revealCmd }: { view: AdminView; sound: boolean; revealCmd: number }) {
  const top = view.leaderboard.slice(0, 3);
  // stage: 0 = nothing, 1 = 3rd, 2 = 2nd, 3 = 1st, 4 = champion card
  const [stage, setStage] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const seq = [
      () => sound && sfx("drum"),
      () => setStage(1),
      () => sound && sfx("drum"),
      () => setStage(2),
      () => sound && sfx("drum"),
      () => {
        setStage(3);
        if (sound) sfx("fanfare");
        cannons();
      },
      () => setStage(4),
    ];
    const delays = [600, 1700, 3200, 4300, 5800, 7100, 9500];
    seq.forEach((fn, i) => timers.push(setTimeout(() => !cancelled && fn(), delays[i])));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [sound, revealCmd]);

  const slots: { row?: LeaderRow; place: number; height: number; at: number; color: string }[] = [
    { row: top[1], place: 2, height: 300, at: 2, color: "#c0cbdc" },
    { row: top[0], place: 1, height: 420, at: 3, color: "#ffcc4d" },
    { row: top[2], place: 3, height: 220, at: 1, color: "#d08a4a" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "110px 80px 0" }}>
      <div className="pixel" style={{ fontSize: 90, fontWeight: 700, color: "var(--gold)" }}>
        Final Podium
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 40, width: "100%", justifyContent: "center" }}>
        {slots.map((s) => {
          const shown = stage >= s.at && s.row;
          return (
            <div key={s.place} style={{ width: 420, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(80px)",
                  transition: "all 0.7s cubic-bezier(.2,.9,.3,1.3)",
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                {s.row && (
                  <>
                    <Sprite sprite={avatarSprite(s.row.name)} seed={s.row.name} size={s.place === 1 ? 190 : 140} className="anim-bob" />
                    <div style={{ fontSize: s.place === 1 ? 52 : 40, fontWeight: 700 }}>{s.row.name}</div>
                    <div className="num" style={{ fontSize: 40, color: s.color }}>
                      {shown ? <CountUp value={s.row.score} duration={1200} /> : 0} pts
                    </div>
                  </>
                )}
              </div>
              <div
                className="num"
                style={{
                  width: "100%",
                  height: s.height,
                  borderRadius: "20px 20px 0 0",
                  background: `linear-gradient(180deg, ${s.color}, ${s.color}55)`,
                  display: "flex",
                  justifyContent: "center",
                  paddingTop: 20,
                  fontSize: 140,
                  fontWeight: 700,
                  color: "rgba(0,0,0,0.45)",
                  boxShadow: s.place === 1 && stage >= 3 ? "0 0 80px rgba(255,204,77,0.6)" : "none",
                }}
              >
                {s.place}
              </div>
            </div>
          );
        })}
      </div>
      <TournamentChampionBadge view={view} show={stage >= 4} />
    </div>
  );
}

function TournamentChampionBadge({ view, show }: { view: AdminView; show: boolean }) {
  const champ = view.tournament.champion;
  useEffect(() => {
    if (show && champ) burst({ y: 0.2, count: 60 });
  }, [show, champ]);
  if (!champ) return null;
  return (
    <div
      className="card"
      style={{
        position: "absolute",
        top: 120,
        right: 60,
        padding: "20px 30px",
        fontSize: 34,
        fontWeight: 700,
        borderColor: "var(--magic)",
        opacity: show ? 1 : 0,
        transform: show ? "scale(1)" : "scale(0.6)",
        transition: "all 0.5s cubic-bezier(.2,.9,.3,1.3)",
        maxWidth: 520,
      }}
    >
      <div className="pixel" style={{ color: "var(--magic)", fontSize: 30 }}>⚔️ TOURNAMENT CHAMPION</div>
      {champ}
    </div>
  );
}
