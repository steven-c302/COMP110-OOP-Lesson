// Starter code and hidden tests for each coding task (Python files bundled as text).
import type { TaskId } from "../../../shared/types.ts";
import encStarter from "../python/tasks/encapsulation_starter.py?raw";
import encTests from "../python/tasks/encapsulation_tests.py?raw";
import absStarter from "../python/tasks/abstraction_starter.py?raw";
import absTests from "../python/tasks/abstraction_tests.py?raw";
import inhStarter from "../python/tasks/inheritance_starter.py?raw";
import inhTests from "../python/tasks/inheritance_tests.py?raw";
import polyTests from "../python/tasks/polymorphism_tests.py?raw";

export interface TaskDef {
  starter: string;
  tests: string;
  practice: boolean; // can battle house bots
}

export const TASKS: Record<TaskId, TaskDef> = {
  encapsulation: { starter: encStarter, tests: encTests, practice: false },
  abstraction: { starter: absStarter, tests: absTests, practice: false },
  inheritance: { starter: inhStarter, tests: inhTests, practice: true },
  polymorphism: { starter: inhStarter, tests: polyTests, practice: true },
};

/** Test titles (docstrings) so students see the checklist before their first run. */
export function checklist(tests: string): string[] {
  const out: string[] = [];
  const re = /def test_\w+\([^)]*\):\s*\n\s*"""([^"]+)"""/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tests))) out.push(m[1].trim());
  return out;
}
