import { useState } from "react";
import { Logo } from "./screen/ScreenBasics.tsx";

export function PinGate({ onPin, error, role }: { onPin: (pin: string) => void; error?: string; role: string }) {
  const [pin, setPin] = useState("");
  return (
    <div className="arena-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form
        className="card"
        style={{ padding: 32, width: "min(440px, 100%)", display: "flex", flexDirection: "column", gap: 18 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (pin.trim()) onPin(pin.trim());
        }}
      >
        <div style={{ transform: "scale(0.6)", transformOrigin: "left", height: 70 }}>
          <Logo size={80} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{role}</div>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          placeholder="Host PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ padding: "12px 16px", borderRadius: 12, border: "2px solid var(--line)", background: "var(--bg-deep)", fontSize: 22 }}
        />
        {error && <div style={{ color: "var(--dmg)", fontWeight: 700 }}>{error}</div>}
        <button className="btn btn-gold" type="submit">
          Enter
        </button>
        <div className="muted" style={{ fontSize: 14 }}>
          The PIN is the HOST_PIN set on the server (1234 if not set).
        </div>
      </form>
    </div>
  );
}
