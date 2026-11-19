// Socket hooks for the student and admin (host / projector) roles.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { AdminView, StudentView } from "../../../shared/types.ts";

const TOKEN_KEY = "oop-arena-token";
const PIN_KEY = "oop-arena-pin";

function storage(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
  return null;
}

/** Offset between server clock and ours, so every device shows the same countdown. */
function useServerClock() {
  const offset = useRef(0);
  const sync = useCallback((serverNow: number) => {
    offset.current = serverNow - Date.now();
  }, []);
  const now = useCallback(() => Date.now() + offset.current, []);
  return useMemo(() => ({ sync, now }), [sync, now]);
}

export type StudentStatus = "connecting" | "need_join" | "joined" | "kicked" | "offline";

export function useStudent() {
  const [view, setView] = useState<StudentView | null>(null);
  const [status, setStatus] = useState<StudentStatus>("connecting");
  const socketRef = useRef<Socket | null>(null);
  const clock = useServerClock();

  useEffect(() => {
    const token = storage(TOKEN_KEY);
    const socket = io({ auth: { role: "student", ...(token ? { token } : {}) }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("state", (v: StudentView) => {
      clock.sync(v.serverNow);
      setView(v);
      setStatus("joined");
    });
    socket.on("need_join", () => {
      storage(TOKEN_KEY, null);
      setStatus("need_join");
    });
    socket.on("kicked", () => {
      storage(TOKEN_KEY, null);
      setStatus("kicked");
    });
    socket.on("disconnect", () => setStatus((s) => (s === "kicked" ? s : "offline")));
    socket.io.on("reconnect_attempt", () => {
      const t = storage(TOKEN_KEY);
      socket.auth = { role: "student", ...(t ? { token: t } : {}) };
    });
    return () => {
      socket.disconnect();
    };
  }, [clock]);

  const join = useCallback(
    (name: string) =>
      new Promise<string | null>((resolve) => {
        socketRef.current?.emit("join", { name }, (res: { ok: boolean; error?: string; token?: string }) => {
          if (res.ok && res.token) {
            storage(TOKEN_KEY, res.token);
            resolve(null);
          } else resolve(res.error ?? "Could not join");
        });
      }),
    [],
  );

  const emit = useCallback((event: string, payload?: unknown, ack?: (res: unknown) => void) => {
    if (ack) socketRef.current?.emit(event, payload, ack);
    else socketRef.current?.emit(event, payload);
  }, []);

  return { view, status, join, emit, now: clock.now };
}

export type AdminStatus = "need_pin" | "connecting" | "ready" | "bad_pin" | "offline";

export function useAdmin() {
  const [view, setView] = useState<AdminView | null>(null);
  const [pin, setPinState] = useState<string | null>(() => storage(PIN_KEY));
  const [status, setStatus] = useState<AdminStatus>(pin ? "connecting" : "need_pin");
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const clock = useServerClock();

  useEffect(() => {
    if (!pin) return;
    const s = io({ auth: { role: "admin", pin }, transports: ["websocket", "polling"] });
    socketRef.current = s;
    setSocket(s);
    s.on("state", (v: AdminView) => {
      clock.sync(v.serverNow);
      setView(v);
      setStatus("ready");
    });
    s.on("auth_error", () => {
      storage(PIN_KEY, null);
      setStatus("bad_pin");
      setPinState(null);
    });
    s.on("disconnect", () => setStatus((st) => (st === "bad_pin" ? st : "offline")));
    s.on("connect", () => setStatus((st) => (st === "offline" ? "connecting" : st)));
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [pin, clock]);

  const setPin = useCallback((p: string) => {
    storage(PIN_KEY, p);
    setStatus("connecting");
    setPinState(p);
  }, []);

  const emit = useCallback((event: string, payload?: unknown, ack?: (res: unknown) => void) => {
    if (ack) socketRef.current?.emit(event, payload, ack);
    else socketRef.current?.emit(event, payload);
  }, []);

  return { view, status, setPin, emit, socket, now: clock.now };
}

/** Re-render every `ms` milliseconds (for countdowns). */
export function useTick(ms = 200) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
