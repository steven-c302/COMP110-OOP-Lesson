// HTTP + Socket.IO server. Serves the built client in production.
import express from "express";
import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { LESSON } from "./lesson.ts";
import { Session, type SessionSnapshot } from "./session.ts";
import type { TournamentResult } from "../shared/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3001);
const PROD = process.env.NODE_ENV === "production";
const HOST_PIN = process.env.HOST_PIN || "1234";
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const SNAPSHOT = join(ROOT, ".session-snapshot.json");

if (!process.env.HOST_PIN) console.warn("⚠️  HOST_PIN not set, so the host PIN is 1234. Set HOST_PIN before class!");

const app = express();
const http = createServer(app);
const io = new Server(http, { maxHttpBufferSize: 8e6, pingTimeout: 30_000 });

// ---------------------------------------------------------------- session
let dirty = { all: false, admin: false };
let flushTimer: NodeJS.Timeout | null = null;
let snapshotDirty = false;

const session = new Session(LESSON, undefined, (scope) => {
  dirty[scope] = true;
  snapshotDirty = true;
  if (!flushTimer) flushTimer = setTimeout(flush, 80);
});
if (PUBLIC_URL) session.joinUrl = PUBLIC_URL;

try {
  if (existsSync(SNAPSHOT)) {
    const snap = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as SessionSnapshot;
    if (Date.now() - snap.savedAt < 6 * 3600_000) {
      session.restore(snap);
      console.log(`Restored session: ${snap.players.length} players, step ${snap.stepIndex}`);
    }
  }
} catch (err) {
  console.warn("Could not restore snapshot:", err);
}

setInterval(() => {
  if (!snapshotDirty) return;
  snapshotDirty = false;
  try {
    writeFileSync(SNAPSHOT, JSON.stringify(session.snapshot()));
  } catch (err) {
    console.warn("Snapshot failed:", err);
  }
}, 3000);

function flush() {
  flushTimer = null;
  const { all, admin } = dirty;
  dirty = { all: false, admin: false };
  if (all || admin) io.to("admin").emit("state", session.adminView());
  if (all) {
    for (const socket of io.sockets.sockets.values()) {
      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) continue;
      const view = session.studentView(playerId);
      if (view) socket.emit("state", view);
    }
  }
}

// ---------------------------------------------------------------- sockets
function pinOk(pin: unknown): boolean {
  const a = Buffer.from(String(pin ?? ""));
  const b = Buffer.from(HOST_PIN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function rateLimited(socket: Socket): boolean {
  const now = Date.now();
  const bucket = (socket.data.bucket ??= { start: now, count: 0 });
  if (now - bucket.start > 1000) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  return bucket.count > 40;
}

io.on("connection", (socket) => {
  const auth = socket.handshake.auth ?? {};

  // ---------------- host / projector
  if (auth.role === "admin") {
    if (!pinOk(auth.pin)) {
      socket.emit("auth_error", "Wrong host PIN");
      socket.disconnect(true);
      return;
    }
    if (!PUBLIC_URL && !session.joinUrl) {
      const origin = socket.handshake.headers.origin;
      if (origin) session.joinUrl = origin;
    }
    socket.join("admin");
    socket.emit("state", session.adminView());
    if (session.tournament.result) socket.emit("tournament:data", session.tournament.result);

    socket.on("goto", (index: number) => session.goto(Number(index)));
    socket.on("quiz", (action) => session.quizAction(action));
    socket.on("lock", (locked: boolean) => session.setLocked(!!locked));
    socket.on("settings", (patch) => session.updateSettings(patch ?? {}));
    socket.on("kick", (id: string) => {
      for (const s of io.sockets.sockets.values()) {
        if (s.data.playerId === id) {
          s.emit("kicked");
          s.disconnect(true);
        }
      }
      session.kick(id);
    });
    socket.on("rename", ({ id, name }, ack) => {
      const error = session.rename(id, name);
      if (typeof ack === "function") ack(error);
    });
    socket.on("reset", () => {
      for (const s of io.sockets.sockets.values()) {
        if (s.data.playerId) {
          s.emit("kicked");
          s.disconnect(true);
        }
      }
      session.reset();
    });
    socket.on("tournament:start", () => {
      const entries = session.startTournament();
      if (entries) io.to("admin").emit("tournament:compute", { entries, seed: Math.floor(Math.random() * 1e9) });
    });
    socket.on("tournament:result", (result: TournamentResult) => {
      if (session.tournament.status !== "computing") return;
      session.tournamentResult(result);
      io.to("admin").emit("tournament:data", result);
    });
    socket.on("tournament:get", () => {
      if (session.tournament.result) socket.emit("tournament:data", session.tournament.result);
      else if (session.tournament.status === "computing") {
        socket.emit("tournament:compute", { entries: session.tournament.entries, seed: 1 });
      }
    });
    socket.on("tournament:progress", ({ revealed, current }) => session.tournamentProgress(revealed, current ?? null));
    socket.on("tournament:done", () => session.tournamentDone());
    socket.on("tournament:reset", () => session.resetTournament());
    // host → projector remote control (skip battle, speed, podium reveal...)
    socket.on("screen:cmd", (cmd: string) => io.to("admin").emit("screen:cmd", String(cmd).slice(0, 40)));
    return;
  }

  // ---------------- students
  const attach = (playerId: string) => {
    socket.data.playerId = playerId;
    session.setConnected(playerId, true);
    const view = session.studentView(playerId);
    if (view) socket.emit("state", view);
  };

  if (typeof auth.token === "string") {
    const existing = [...session.players.values()].find((p) => p.token === auth.token);
    if (existing) {
      session.join(existing.name, auth.token);
      attach(existing.id);
    } else {
      socket.emit("need_join");
    }
  } else {
    socket.emit("need_join");
  }

  socket.on("join", ({ name }, ack) => {
    if (socket.data.playerId) return ack?.({ ok: false, error: "Already joined" });
    const result = session.join(name);
    if (!result.ok) return ack?.(result);
    ack?.({ ok: true, token: result.player.token, name: result.player.name });
    attach(result.player.id);
  });

  const player = () => socket.data.playerId as string | undefined;
  socket.on("answer", ({ stepId, choice }, ack) => {
    if (rateLimited(socket) || !player()) return;
    const ok = session.answer(player()!, String(stepId), Number(choice));
    if (typeof ack === "function") ack(ok);
  });
  socket.on("codeResult", (data) => {
    if (rateLimited(socket) || !player() || !data) return;
    session.codeResult(player()!, String(data.stepId), data);
  });
  socket.on("saveCode", ({ taskId, code }) => {
    if (rateLimited(socket) || !player()) return;
    session.saveCode(player()!, String(taskId), String(code));
  });
  socket.on("submitFighter", ({ code, card }, ack) => {
    if (rateLimited(socket) || !player()) return;
    const error = session.submitFighter(player()!, String(code), card ?? {});
    if (typeof ack === "function") ack(error);
  });
  socket.on("cheer", (side: 0 | 1) => {
    if (!player()) return;
    session.cheer(player()!, side);
  });
  socket.on("disconnect", () => {
    const id = player();
    if (!id) return;
    const stillConnected = [...io.sockets.sockets.values()].some((s) => s.id !== socket.id && s.data.playerId === id);
    if (!stillConnected) session.setConnected(id, false);
  });
});

// ---------------------------------------------------------------- http
app.get("/healthz", (_req, res) => res.json({ ok: true, players: session.players.size }));

if (PROD) {
  const dist = join(ROOT, "dist");
  app.use(express.static(dist, { maxAge: "1h", index: false }));
  app.get("*", (_req, res) => res.sendFile(join(dist, "index.html")));
}

http.listen(PORT, () => {
  console.log(`OOP Arena server on http://localhost:${PORT}${PROD ? "" : " (dev: open http://localhost:5471)"}`);
});
