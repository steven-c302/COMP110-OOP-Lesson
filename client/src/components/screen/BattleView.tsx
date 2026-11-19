// Animated replay of one precomputed battle log, made for a projector.
import { useEffect, useMemo, useRef, useState } from "react";
import type { BattleLog, TournamentFighter, TurnLog } from "../../../../shared/types.ts";
import { Sprite } from "../Sprite.tsx";
import { sfx } from "../../lib/sound.ts";
import { burst } from "../../lib/confetti.ts";

interface Props {
  battle: BattleLog;
  fighters: [TournamentFighter, TournamentFighter];
  label: string;
  speed: number; // 1 or 2
  skipSignal: number; // increments to skip to the end
  sound: boolean;
  cheers: [number, number];
  onDone: () => void;
}

type Float = { id: number; side: 0 | 1; text: string; color: string; big?: boolean };

const MOVE_CALL: Record<string, string> = {
  strike: "strike()",
  heavy: "heavy_strike()",
  guard: "guard()",
  heal: "heal()",
  fumble: "???",
};

export function describeTurn(turn: TurnLog, cls: string): { text: string; color: string } {
  const call = `${cls}.choose_move() → `;
  if (turn.error) return { text: `💥 ${cls}.choose_move() crashed: ${turn.error}`, color: "var(--dmg)" };
  const move = MOVE_CALL[turn.move];
  if (turn.move === "guard") return { text: `${call}${move} 🛡 next attack +50%`, color: "var(--cyan)" };
  if (turn.move === "heal") return { text: `${call}${move} 🧪 +${turn.heal} HP`, color: "var(--hp)" };
  if (turn.dodged) return { text: `${call}${move} · DODGED!`, color: "var(--muted)" };
  if (!turn.hit) return { text: `${call}${move} · MISS`, color: "var(--muted)" };
  const extras = [turn.charged ? "⚡charged" : "", turn.guarded ? "(guarded)" : ""].filter(Boolean).join(" ");
  return { text: `${call}${move} · ${turn.dmg} dmg ${extras}`, color: turn.move === "heavy" ? "var(--orange)" : "var(--text)" };
}

export function BattleView({ battle, fighters, label, speed, skipSignal, sound, cheers, onDone }: Props) {
  const [phase, setPhase] = useState<"intro" | "fight" | "end">("intro");
  const [turnIdx, setTurnIdx] = useState(-1);
  const [hp, setHp] = useState<[number, number]>([battle.fighters[0].maxHp, battle.fighters[1].maxHp]);
  const [ghost, setGhost] = useState<[number, number]>(hp);
  const [floats, setFloats] = useState<Float[]>([]);
  const [shake, setShake] = useState(0);
  const [lunge, setLunge] = useState<{ side: 0 | 1; n: number } | null>(null);
  const [flash, setFlash] = useState<{ side: 0 | 1; n: number } | null>(null);
  const [guarding, setGuarding] = useState<[boolean, boolean]>([false, false]);
  const [log, setLog] = useState<{ text: string; color: string; n: number }[]>([]);
  const floatId = useRef(0);
  const doneRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const max: [number, number] = [battle.fighters[0].maxHp, battle.fighters[1].maxHp];
  const cls: [string, string] = [battle.fighters[0].cls, battle.fighters[1].cls];

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms / speedRef.current));
  };
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // intro
  useEffect(() => {
    if (sound) sfx("slam");
    later(2600, () => {
      setPhase("fight");
      setTurnIdx(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // skip to the end
  const firstSkip = useRef(skipSignal);
  useEffect(() => {
    if (skipSignal === firstSkip.current || phase === "end") return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const last = battle.turns[battle.turns.length - 1];
    if (last) {
      setHp(last.hp);
      setGhost(last.hp);
    }
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipSignal]);

  const finish = () => {
    setPhase("end");
    if (sound) sfx(battle.reason === "ko" ? "ko" : "gong");
    if (battle.reason === "ko") setShake((s) => s + 1);
    later(1100, () => {
      if (sound) sfx("fanfare");
      burst({ x: battle.winner === 0 ? 0.25 : 0.75, y: 0.45, count: 80 });
    });
    later(3600, () => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    });
  };

  // play turns
  useEffect(() => {
    if (phase !== "fight" || turnIdx < 0) return;
    const turn = battle.turns[turnIdx];
    if (!turn) {
      finish();
      return;
    }
    const me = turn.actor;
    const them = (1 - me) as 0 | 1;
    const isLast = turnIdx === battle.turns.length - 1;
    const long = battle.turns.length > 24 && turnIdx > 8;
    const base = (turn.move === "heavy" ? 950 : 720) * (long ? 0.55 : 1);

    const desc = describeTurn(turn, cls[me]);
    setLog((l) => [...l.slice(-3), { ...desc, n: turnIdx }]);
    setGuarding((g) => {
      const next: [boolean, boolean] = [...g] as [boolean, boolean];
      next[me] = turn.move === "guard" && !turn.error;
      return next;
    });

    const addFloat = (side: 0 | 1, text: string, color: string, big = false) => {
      const id = ++floatId.current;
      setFloats((f) => [...f, { id, side, text, color, big }]);
      later(1100, () => setFloats((f) => f.filter((x) => x.id !== id)));
    };

    if (turn.error) {
      if (sound) sfx("fumble");
      addFloat(me, "CRASH!", "var(--dmg)");
    } else if (turn.move === "guard") {
      if (sound) sfx("guard");
      addFloat(me, "GUARD", "var(--cyan)");
    } else if (turn.move === "heal") {
      if (sound) sfx("heal");
      addFloat(me, `+${turn.heal}`, "var(--hp)", true);
      setHp(turn.hp);
      setGhost(turn.hp);
    } else {
      setLunge({ side: me, n: turnIdx });
      if (turn.hit) {
        // hit-stop: freeze a beat, then flash + knockback + numbers
        later(140, () => {
          if (sound) sfx(turn.move === "heavy" ? "heavy" : "hit");
          setFlash({ side: them, n: turnIdx });
          setHp(turn.hp);
          addFloat(them, `-${turn.dmg}`, turn.move === "heavy" ? "var(--orange)" : "var(--dmg)", turn.move === "heavy");
          if (turn.move === "heavy" || (isLast && battle.reason === "ko")) setShake((s) => s + 1);
        });
        later(560, () => setGhost(turn.hp));
      } else {
        later(160, () => {
          if (sound) sfx("whiff");
          addFloat(turn.dodged ? them : me, turn.dodged ? "DODGE!" : "MISS", "var(--muted)");
        });
      }
    }

    later(isLast ? base + 400 : base, () => {
      if (isLast) finish();
      else setTurnIdx((i) => i + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIdx, phase]);

  const winner = battle.winner;
  const totalCheers = cheers[0] + cheers[1];

  return (
    <div key={`shake-${shake}`} className={shake ? "shake" : ""} style={{ position: "absolute", inset: 0 }}>
      <div className="arena-floor" />
      <div className="pixel" style={{ position: "absolute", top: 40, left: 0, right: 0, textAlign: "center", fontSize: 40, color: "var(--muted)", letterSpacing: "0.1em" }}>
        {label}
      </div>

      {[0, 1].map((sideNum) => {
        const side = sideNum as 0 | 1;
        const f = battle.fighters[side];
        const pct = Math.max(0, hp[side] / max[side]);
        const gpct = Math.max(0, ghost[side] / max[side]);
        const barColor = pct > 0.5 ? "var(--hp)" : pct > 0.25 ? "var(--amber)" : "var(--dmg)";
        const lost = phase === "end" && winner !== side;
        const won = phase === "end" && winner === side;
        const x = side === 0 ? 120 : 1920 - 120 - 700;
        return (
          <div key={side} style={{ position: "absolute", left: x, top: 120, width: 700, display: "flex", flexDirection: "column", alignItems: side === 0 ? "flex-start" : "flex-end" }}>
            <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.05 }} className="pixel">
              {f.name}
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 6, flexDirection: side === 0 ? "row" : "row-reverse" }}>
              <span className="mono" style={{ fontSize: 26, color: "var(--code-cls)" }}>
                class {f.cls}(Fighter)
              </span>
              <span className="chip" style={{ fontSize: 22 }}>{fighters[side].player}</span>
            </div>
            {/* HP bar */}
            <div style={{ position: "relative", width: 700, height: 44, marginTop: 16, borderRadius: 12, background: "rgba(0,0,0,0.5)", border: "3px solid rgba(255,255,255,0.25)", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, width: `${gpct * 100}%`, background: "rgba(255,255,255,0.65)", transition: "width 0.45s ease-out", ...(side === 1 ? { right: 0 } : { left: 0 }) }} />
              <div
                className={pct <= 0.25 && pct > 0 ? "anim-pulse" : ""}
                style={{ position: "absolute", top: 0, bottom: 0, width: `${pct * 100}%`, background: barColor, transition: "width 0.12s linear, background 0.3s", ...(side === 1 ? { right: 0 } : { left: 0 }) }}
              />
              <div className="num" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, textShadow: "0 2px 0 #000" }}>
                {hp[side]} / {max[side]}
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 26, color: "var(--muted)", fontWeight: 700 }}>
              <span>⚔️ {f.power}</span>
              <span>🛡️ {f.defense}</span>
              <span>⚡ {f.speed}</span>
            </div>

            {/* fighter sprite */}
            <div style={{ position: "relative", marginTop: 40, alignSelf: side === 0 ? "flex-end" : "flex-start", marginRight: side === 0 ? 40 : 0, marginLeft: side === 1 ? 40 : 0 }}>
              {phase === "intro" && (
                <div
                  className="anim-pop card"
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    [side === 0 ? "left" : "right"]: -40,
                    width: 520,
                    padding: "16px 22px",
                    fontSize: 32,
                    fontWeight: 700,
                    animationDelay: side === 0 ? "0.5s" : "1.3s",
                    borderColor: "var(--gold)",
                    zIndex: 3,
                  }}
                >
                  “{battle.cries[side]}”
                </div>
              )}
              <div
                key={`lunge-${lunge?.side === side ? lunge.n : "x"}-${flash?.side === side ? flash.n : "y"}`}
                className={[
                  phase === "intro" ? (side === 0 ? "enter-left" : "enter-right") : "",
                  lunge?.side === side ? (side === 0 ? "lunge-right" : "lunge-left") : "",
                  flash?.side === side ? (side === 0 ? "knock-left hit-flash" : "knock-right hit-flash") : "",
                ].join(" ")}
                style={{ position: "relative" }}
              >
                <div className={lost ? (side === 0 ? "ko-left" : "ko-right") : won ? "anim-bob" : phase === "fight" ? "idle-bob" : ""}>
                  <Sprite sprite={f.sprite} seed={fighters[side].player} size={340} flip={side === 1} />
                </div>
                {guarding[side] && phase === "fight" && <div className="shield-bubble" />}
              </div>
              <div style={{ position: "absolute", left: "10%", right: "10%", bottom: -18, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.45)", filter: "blur(6px)", zIndex: -1 }} />
              {floats
                .filter((fl) => fl.side === side)
                .map((fl) => (
                  <div
                    key={fl.id}
                    className={/\d/.test(fl.text) ? "num" : "pixel"}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 40,
                      fontSize: fl.big ? 110 : 80,
                      fontWeight: 700,
                      color: fl.color,
                      textShadow: "0 5px 0 #000, 0 0 30px rgba(0,0,0,0.6)",
                      animation: "float-up 1.05s ease-out forwards",
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                      zIndex: 4,
                    }}
                  >
                    {fl.text}
                  </div>
                ))}
            </div>
          </div>
        );
      })}

      {/* VS + cheers */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 430, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        {phase === "intro" && (
          <div className="pixel" style={{ fontSize: 220, fontWeight: 700, color: "var(--gold)", animation: "slam 0.6s cubic-bezier(.2,.9,.3,1.2) both", textShadow: "0 10px 0 #000" }}>
            VS
          </div>
        )}
        {phase === "fight" && (
          <div className="num" style={{ fontSize: 34, color: "var(--muted)" }}>
            Turn {Math.max(1, turnIdx + 1)}
          </div>
        )}
        {totalCheers > 0 && (
          <div style={{ width: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>📣 Cheers</div>
            <div style={{ width: "100%", height: 18, borderRadius: 999, overflow: "hidden", display: "flex", border: "2px solid var(--line)" }}>
              <div style={{ width: `${(100 * cheers[0]) / totalCheers}%`, background: "var(--cyan)", transition: "width 0.4s" }} />
              <div style={{ flex: 1, background: "var(--magic)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 24, fontWeight: 700 }}>
              <span style={{ color: "var(--cyan)" }}>{cheers[0]}</span>
              <span style={{ color: "var(--magic)" }}>{cheers[1]}</span>
            </div>
          </div>
        )}
      </div>

      {/* end banner */}
      {phase === "end" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          <div style={{ textAlign: "center" }}>
            <div className="pixel" style={{ fontSize: 200, fontWeight: 700, color: battle.reason === "ko" ? "var(--dmg)" : "var(--gold)", animation: "slam 0.55s cubic-bezier(.2,.9,.3,1.2) both", textShadow: "0 12px 0 #000" }}>
              {battle.reason === "ko" ? "K.O.!" : "TIME!"}
            </div>
            <div className="pixel anim-pop" style={{ animationDelay: "0.9s", fontSize: 64, fontWeight: 700, textShadow: "0 6px 0 #000" }}>
              🏆 {battle.fighters[winner].name} wins{battle.reason === "decision" ? " on HP%" : ""}!
            </div>
          </div>
        </div>
      )}

      {/* battle log */}
      <div className="mono" style={{ position: "absolute", left: 120, right: 120, bottom: 40, display: "flex", flexDirection: "column", gap: 6 }}>
        {log.map((line, i) => (
          <div
            key={line.n}
            style={{
              fontSize: 28,
              color: line.color,
              opacity: 0.35 + (0.65 * (i + 1)) / log.length,
              background: i === log.length - 1 ? "rgba(0,0,0,0.45)" : "transparent",
              padding: "4px 16px",
              borderRadius: 10,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small helper for intros elsewhere. */
export function useTotalTurns(battle: BattleLog) {
  return useMemo(() => battle.turns.length, [battle]);
}
