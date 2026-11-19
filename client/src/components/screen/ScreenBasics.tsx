// Projector views: pillar bar, lobby, slides.
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { PILLARS, type AdminView, type PillarId, type SlideStep, type Step } from "../../../../shared/types.ts";
import { CodeBlock } from "../CodeBlock.tsx";
import { Sprite, avatarSprite } from "../Sprite.tsx";
import { sfx } from "../../lib/sound.ts";
import { SPRITE_IDS } from "../../lib/sprites.ts";

const PILLAR_ORDER: PillarId[] = ["encapsulation", "abstraction", "inheritance", "polymorphism"];

export function PillarBar({ steps, index }: { steps: Step[]; index: number }) {
  const reached = new Set(steps.slice(0, index + 1).map((s) => s.pillar).filter(Boolean));
  const current = steps[index]?.pillar;
  return (
    <div style={{ position: "absolute", top: 28, right: 40, display: "flex", gap: 12, zIndex: 5 }}>
      {PILLAR_ORDER.map((id) => {
        const p = PILLARS[id];
        const on = reached.has(id);
        const active = current === id;
        return (
          <div
            key={id}
            className="pixel"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 24,
              fontWeight: 600,
              background: on ? `${p.color}22` : "rgba(255,255,255,0.04)",
              border: `2px solid ${on ? p.color : "rgba(255,255,255,0.12)"}`,
              color: on ? p.color : "var(--muted)",
              opacity: on ? 1 : 0.55,
              boxShadow: active ? `0 0 24px ${p.color}88` : "none",
              transition: "all 0.4s",
            }}
          >
            <span style={{ filter: on ? "none" : "grayscale(1)" }}>{p.glyph}</span>
            {p.name}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ lobby
export function ScreenLobby({ view, sound }: { view: AdminView; sound: boolean }) {
  const [qr, setQr] = useState("");
  const url = view.joinUrl || window.location.origin;
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 600, color: { dark: "#151a2eff", light: "#ffffffff" } }).then(setQr, () => setQr(""));
  }, [url]);
  const count = view.players.length;
  const prev = useRef(count);
  useEffect(() => {
    if (sound && count > prev.current) sfx("pop");
    prev.current = count;
  }, [count, sound]);
  const players = view.players;
  // three size tiers so up to ~150 names fit on the projector
  const tier = players.length <= 18 ? 0 : players.length <= 48 ? 1 : 2;
  const chipFont = [30, 23, 17][tier];
  const chipAvatar = [48, 34, 24][tier];
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "720px 1fr", gap: 60, padding: "70px 80px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <Logo size={92} />
        <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 34, color: "var(--muted)", fontWeight: 700 }}>Join on your laptop</div>
          <div className="pixel" style={{ fontSize: url.length > 34 ? 40 : 54, color: "var(--gold)", fontWeight: 700, textAlign: "center", wordBreak: "break-all" }}>
            {url.replace(/^https?:\/\//, "")}
          </div>
          {qr && <img src={qr} alt="QR code to join" width={300} height={300} style={{ borderRadius: 16, imageRendering: "pixelated" }} />}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginBottom: 24 }}>
          <div className="num" style={{ fontSize: 120, color: "var(--gold)", lineHeight: 1 }}>
            {count}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{count === 1 ? "fighter" : "fighters"} in the arena</div>
        </div>
        {count === 0 && (
          <div style={{ fontSize: 40, color: "var(--muted)", marginTop: 40, display: "flex", gap: 24, alignItems: "center" }}>
            <Sprite sprite="slime" size={96} className="anim-bob" /> Waiting for the first challenger…
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: [16, 10, 7][tier], alignContent: "flex-start", overflow: "hidden" }}>
          {players.map((p) => (
            <div
              key={p.id}
              className="anim-pop"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: ["8px 18px 8px 8px", "5px 14px 5px 6px", "3px 10px 3px 4px"][tier],
                borderRadius: 14,
                background: "var(--panel)",
                border: "2px solid var(--line)",
                fontSize: chipFont,
                fontWeight: 700,
                opacity: p.connected ? 1 : 0.4,
              }}
            >
              <Sprite sprite={avatarSprite(p.name)} seed={p.name} size={chipAvatar} />
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Logo({ size = 96 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.25 }}>
      <Sprite sprite="knight" size={size * 1.1} className="anim-bob" />
      <div>
        <div
          className="pixel"
          style={{
            fontSize: size,
            fontWeight: 700,
            lineHeight: 0.95,
            whiteSpace: "nowrap",
            background: "linear-gradient(180deg, #fff3c4 0%, var(--gold) 55%, #e08a00 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 6px 0 rgba(0,0,0,0.45))",
          }}
        >
          OOP ARENA
        </div>
        <div className="pixel" style={{ fontSize: size * 0.28, color: "var(--muted)", letterSpacing: "0.12em" }}>
          THE FOUR PILLARS
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ slides
export function ScreenSlide({ step }: { step: SlideStep }) {
  const pillar = step.pillar ? PILLARS[step.pillar] : null;
  const accent = pillar?.color ?? "var(--gold)";

  if (step.layout === "title") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, textAlign: "center", padding: 120 }}>
        <div className="arena-floor" />
        <div className="chip pixel" style={{ fontSize: 30, padding: "10px 24px", color: "var(--gold)" }}>{step.kicker}</div>
        <div
          className="pixel anim-pop"
          style={{
            fontSize: 220,
            fontWeight: 700,
            lineHeight: 0.9,
            background: "linear-gradient(180deg, #fff3c4 0%, var(--gold) 55%, #e08a00 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 10px 0 rgba(0,0,0,0.5))",
          }}
        >
          {step.title}
        </div>
        <div style={{ fontSize: 44, maxWidth: 1400, lineHeight: 1.35 }}>{step.subtitle}</div>
        <div style={{ display: "flex", gap: 36, marginTop: 30 }}>
          {SPRITE_IDS.map((s, i) => (
            <div key={s} className="anim-bob" style={{ animationDelay: `${i * 0.15}s` }}>
              <Sprite sprite={s} size={120} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step.layout === "pillars") {
    return (
      <div style={{ position: "absolute", inset: 0, padding: "140px 100px 80px", display: "flex", flexDirection: "column", gap: 40 }}>
        <Heading kicker={step.kicker} title={step.title} accent={accent} />
        <div style={{ fontSize: 40, color: "var(--muted)" }}>{step.subtitle}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 32, flex: 1 }}>
          {(Object.keys(PILLARS) as PillarId[]).map((id, i) => {
            const p = PILLARS[id];
            const sprite = (["golem", "mage", "knight", "dragon"] as const)[i];
            return (
              <div
                key={id}
                className="card anim-pop"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  padding: 36,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  textAlign: "center",
                  borderColor: p.color,
                  background: `linear-gradient(180deg, ${p.color}22, var(--panel) 60%)`,
                }}
              >
                <div style={{ fontSize: 90 }}>{p.glyph}</div>
                <div className="pixel" style={{ fontSize: 44, fontWeight: 700, color: p.color }}>{p.name}</div>
                <div style={{ fontSize: 36, lineHeight: 1.3 }}>{p.tagline}</div>
                <div style={{ flex: 1 }} />
                <Sprite sprite={sprite} size={130} className="anim-bob" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (step.layout === "pillar" && pillar) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 140px", gap: 100 }}>
        <div
          className="anim-pop"
          style={{
            width: 420,
            height: 420,
            borderRadius: 48,
            display: "grid",
            placeItems: "center",
            fontSize: 230,
            background: `radial-gradient(circle at 50% 40%, ${pillar.color}55, ${pillar.color}11 70%)`,
            border: `4px solid ${pillar.color}`,
            boxShadow: `0 0 120px ${pillar.color}55`,
            flex: "none",
          }}
        >
          {pillar.glyph}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          <div className="pixel" style={{ fontSize: 40, color: "var(--muted)", letterSpacing: "0.1em" }}>
            PILLAR {(PILLAR_ORDER.indexOf(step.pillar!) + 1)} OF 4
          </div>
          <div className="pixel" style={{ fontSize: 150, fontWeight: 700, color: pillar.color, lineHeight: 0.95 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 50, lineHeight: 1.3, maxWidth: 1100 }}>{step.subtitle}</div>
          {step.bullets?.map((b) => (
            <div key={b} className="chip" style={{ fontSize: 34, padding: "12px 26px", alignSelf: "flex-start", borderColor: pillar.color }}>
              🎯 {b}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step.layout === "split" && step.code) {
    return (
      <div style={{ position: "absolute", inset: 0, padding: "140px 80px 70px", display: "grid", gridTemplateColumns: "640px 1fr", gap: 60 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          <Heading kicker={step.kicker} title={step.title} accent={accent} />
          <Bullets items={step.bullets ?? []} accent={accent} size={38} />
        </div>
        <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <CodeBlock code={step.code} size={codeSize(step.code, 1080)} style={{ width: "100%" }} />
        </div>
      </div>
    );
  }

  // bullets / code
  return (
    <div style={{ position: "absolute", inset: 0, padding: "140px 120px 80px", display: "flex", flexDirection: "column", gap: 44 }}>
      <Heading kicker={step.kicker} title={step.title} accent={accent} />
      {step.subtitle && <div style={{ fontSize: 42, color: "var(--muted)" }}>{step.subtitle}</div>}
      {step.code && <CodeBlock code={step.code} size={codeSize(step.code, 1680)} />}
      <Bullets items={step.bullets ?? []} accent={accent} size={44} />
    </div>
  );
}

/** Pick the largest code font (≥ 28px) that fits the width and ~14 lines. */
export function codeSize(code: string, width: number, maxLines = 15, height = 760) {
  const lines = code.split("\n");
  const longest = Math.max(...lines.map((l) => l.length), 20);
  const byWidth = (width - 70) / (longest * 0.62);
  const byHeight = height / (Math.max(lines.length, maxLines * 0.6) * 1.4 + 1.4);
  return Math.max(26, Math.min(40, Math.floor(Math.min(byWidth, byHeight))));
}

function Heading({ kicker, title, accent }: { kicker?: string; title: string; accent: string }) {
  return (
    <div>
      {kicker && (
        <div className="pixel" style={{ fontSize: 34, color: accent, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          {kicker}
        </div>
      )}
      <div className="pixel" style={{ fontSize: 80, fontWeight: 700, lineHeight: 1 }}>
        {title}
      </div>
    </div>
  );
}

function Bullets({ items, accent, size }: { items: string[]; accent: string; size: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.6 }}>
      {items.map((b, i) => (
        <div key={b} className="anim-pop" style={{ animationDelay: `${0.1 + i * 0.12}s`, display: "flex", gap: 20, fontSize: size, lineHeight: 1.3 }}>
          <span className="pixel" style={{ color: accent, flex: "none" }}>▸</span>
          <span>{renderInlineCode(b)}</span>
        </div>
      ))}
    </div>
  );
}

/** Render identifiers like self.strike() or snake_case in the code font. */
const TOKEN = /(@?[A-Za-z_]\w*(?:\([^()\s]*\))?(?:\.[A-Za-z_]\w*(?:\([^()\s]*\))?)*)/g;

function looksLikeCode(token: string) {
  return token.startsWith("@") || token.startsWith("_") || token.includes("(") || /\w\.\w/.test(token) || /[a-z]_[a-z]/.test(token);
}

export function renderInlineCode(text: string) {
  const parts = text.split(TOKEN);
  return parts.map((part, i) =>
    i % 2 === 1 && looksLikeCode(part) ? (
      <code key={i} className="mono" style={{ background: "var(--inline-bg)", padding: "0 0.25em", borderRadius: 6, fontSize: "0.9em", color: "var(--inline-fg)" }}>
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
