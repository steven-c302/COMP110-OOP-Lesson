/// <reference lib="webworker" />
// Runs Python (Pyodide) off the main thread. Student code executes here, sandboxed
// in the browser; the main thread can terminate this worker if it hangs.
import arenaSrc from "./arena.py?raw";
import harnessSrc from "./harness.py?raw";

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

type Py = {
  FS: { writeFile(path: string, data: string): void };
  runPython(code: string): unknown;
  pyimport(name: string): Record<string, (...args: unknown[]) => string>;
};

let harness: Record<string, (...args: unknown[]) => string> | null = null;

const ready = (async () => {
  const mod = await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`);
  const py: Py = await mod.loadPyodide({ indexURL: PYODIDE_URL });
  py.FS.writeFile("/home/pyodide/arena.py", arenaSrc);
  py.FS.writeFile("/home/pyodide/harness.py", harnessSrc);
  py.runPython("import sys\nif '/home/pyodide' not in sys.path: sys.path.insert(0, '/home/pyodide')\nimport harness");
  harness = py.pyimport("harness");
})();

ready.then(
  () => postMessage({ type: "ready" }),
  (err) => postMessage({ type: "load_error", error: String(err) }),
);

self.onmessage = async (event: MessageEvent<{ id: number; op: string; args: unknown[] }>) => {
  const { id, op, args } = event.data;
  try {
    await ready;
    const fn = harness![op];
    if (typeof fn !== "function") throw new Error(`Unknown op ${op}`);
    const out = fn(...args);
    postMessage({ type: "result", id, result: JSON.parse(String(out)) });
  } catch (err) {
    postMessage({ type: "result", id, error: String(err) });
  }
};
