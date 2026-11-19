// /screen: the projector. Plays all audio and runs the tournament in Pyodide.
import { useEffect, useRef, useState } from "react";
import type { TournamentEntry, TournamentResult } from "../../../shared/types.ts";
import { useAdmin, useTick } from "../lib/socket.ts";
import { PinGate } from "../components/PinGate.tsx";
import { ScreenView } from "../components/screen/ScreenView.tsx";
import { synth } from "../lib/sound.ts";
import { py, runTournament } from "../lib/python.ts";
import { Logo } from "../components/screen/ScreenBasics.tsx";

export default function Screen() {
  const { view, status, setPin, emit, socket, now } = useAdmin();
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [cmd, setCmd] = useState({ name: "", n: 0 });
  const [error, setError] = useState<string | null>(null);
  const computing = useRef(false);
  useTick(200);

  useEffect(() => {
    void py.warm().catch(() => {});
  }, []);

  // socket events for the tournament + host remote control
  useEffect(() => {
    if (!socket) return;
    const onCompute = async ({ entries, seed }: { entries: TournamentEntry[]; seed: number }) => {
      if (computing.current) return;
      computing.current = true;
      setError(null);
      try {
        const res = await runTournament(JSON.stringify(entries), seed);
        emit("tournament:result", res);
      } catch (err) {
        setError(`Tournament failed: ${String(err)}`);
      } finally {
        computing.current = false;
      }
    };
    const onData = (r: TournamentResult) => setResult(r);
    const onCmd = (name: string) => setCmd((c) => ({ name, n: c.n + 1 }));
    socket.on("tournament:compute", onCompute);
    socket.on("tournament:data", onData);
    socket.on("screen:cmd", onCmd);
    return () => {
      socket.off("tournament:compute", onCompute);
      socket.off("tournament:data", onData);
      socket.off("screen:cmd", onCmd);
    };
  }, [socket, emit]);

  // recover after a reload mid-tournament
  const status_ = view?.tournament.status;
  useEffect(() => {
    if (!view) return;
    if (status_ === "idle") setResult(null);
    if ((status_ === "playing" || status_ === "computing") && !result) emit("tournament:get");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status_]);

  // music follows the lesson: quiet under the TA's voice, louder for games
  const step = view?.steps[view.stepIndex];
  const phase = view?.quiz?.phase;
  useEffect(() => {
    if (!started || !step) return;
    synth.setMuted(!!view?.settings.muted);
    if (step.type === "lobby") {
      synth.music("lobby");
      synth.setMusicLevel(0.35);
    } else if (step.type === "quiz" && (phase === "open" || phase === "revote" || phase === "reading")) {
      synth.music("think");
      synth.setMusicLevel(0.3);
    } else if (step.type === "code") {
      synth.music("think");
      synth.setMusicLevel(0.12);
    } else if (step.type === "leaderboard") {
      synth.music("lobby");
      synth.setMusicLevel(0.3);
    } else if (step.type === "tournament") {
      synth.setMusicLevel(0.3);
      if (view?.tournament.status !== "playing") synth.music("tension");
    } else {
      synth.music(null);
    }
  }, [started, step, phase, view?.settings.muted, view?.tournament.status]);

  if (status === "need_pin" || status === "bad_pin") {
    return <PinGate role="Projector screen" onPin={setPin} error={status === "bad_pin" ? "Wrong PIN" : undefined} />;
  }
  if (!view) return <Loading />;

  if (!started) {
    return (
      <div className="arena-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          <Logo size={110} />
          <button
            className="btn btn-gold"
            style={{ fontSize: 28, padding: "18px 40px" }}
            onClick={() => {
              synth.unlock();
              setStarted(true);
              void document.documentElement.requestFullscreen?.().catch(() => {});
            }}
          >
            🔊 Start projector (fullscreen + sound)
          </button>
          <div className="muted">Browsers need one click before they can play sound. Press F to toggle 2× speed and Space to skip during battles.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <ScreenView view={view} now={now()} emit={emit} sound={!view.settings.muted} result={result} cmd={cmd} />
      {status === "offline" && <Banner text="Reconnecting to server…" />}
      {error && <Banner text={error} />}
    </div>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", background: "#b3263a", color: "#fff", padding: "8px 16px", borderRadius: 10, fontWeight: 700, zIndex: 50 }}>
      {text}
    </div>
  );
}

export function Loading() {
  return (
    <div className="arena-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="pixel" style={{ fontSize: 28, color: "var(--muted)" }}>Connecting…</div>
    </div>
  );
}
