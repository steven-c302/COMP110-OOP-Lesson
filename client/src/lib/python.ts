// Main-thread wrapper around the Pyodide worker: request/response, timeouts,
// and automatic restart if student code hangs.
import { useEffect, useState } from "react";

export type PyStatus = "idle" | "loading" | "ready" | "error";

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

export class TimeoutError extends Error {}

class PyRunner {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private readyPromise: Promise<void> | null = null;
  status: PyStatus = "idle";
  private listeners = new Set<(s: PyStatus) => void>();

  subscribe(fn: (s: PyStatus) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setStatus(s: PyStatus) {
    this.status = s;
    this.listeners.forEach((fn) => fn(s));
  }

  warm(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.setStatus("loading");
    const worker = new Worker(new URL("../python/worker.ts", import.meta.url), { type: "module" });
    this.worker = worker;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "ready") {
          this.setStatus("ready");
          resolve();
        } else if (msg.type === "load_error") {
          this.setStatus("error");
          this.readyPromise = null;
          reject(new Error(msg.error));
        } else if (msg.type === "result") {
          const p = this.pending.get(msg.id);
          if (!p) return;
          clearTimeout(p.timer);
          this.pending.delete(msg.id);
          if (msg.error) p.reject(new Error(msg.error));
          else p.resolve(msg.result);
        }
      };
      worker.onerror = (e) => {
        this.setStatus("error");
        this.readyPromise = null;
        reject(new Error(e.message || "Python worker failed"));
      };
    });
    return this.readyPromise;
  }

  private restart() {
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new TimeoutError("Python was restarted"));
    }
    this.pending.clear();
    void this.warm().catch(() => {});
  }

  async call<T>(op: string, args: unknown[], timeoutMs = 6000): Promise<T> {
    await this.warm();
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new TimeoutError("Your code took too long. Is there an infinite loop?"));
        this.restart();
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.worker!.postMessage({ id, op, args });
    });
  }
}

export const py = new PyRunner();

export function usePyStatus(): PyStatus {
  const [status, setStatus] = useState<PyStatus>(py.status);
  useEffect(() => {
    setStatus(py.status);
    return py.subscribe(setStatus) as () => void;
  }, []);
  return status;
}

// ---------------------------------------------------------------- typed calls
export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  hint?: string | null;
}

export interface StudentError {
  message: string;
  hint: string | null;
  line?: number | null;
}

export interface TaskRun {
  error: StudentError | null;
  stdout: string;
  tests: TestResult[];
}

export function runTask(code: string, tests: string): Promise<TaskRun> {
  return py.call<TaskRun>("run_task", [code, tests], 8000);
}

export function practice(code: string, seed = Math.floor(Math.random() * 1000)) {
  return py.call<{ error: StudentError | null; battles: import("../../../shared/types.ts").BattleLog[] }>("practice", [code, seed], 10000);
}

export function describeFighter(code: string) {
  return py.call<{ error: StudentError | null; card: import("../../../shared/types.ts").FighterSummary & { cry: string } | null }>(
    "describe",
    [code],
    6000,
  );
}

export function runTournament(entriesJson: string, seed: number) {
  return py.call<import("../../../shared/types.ts").TournamentResult>("tournament", [entriesJson, seed], 120_000);
}
