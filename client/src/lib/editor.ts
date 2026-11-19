// Editor behavior for the student code tasks: Python-style 4-space indentation, Tab that
// indents (or accepts the autocomplete suggestion), and completions for the arena API.
import { acceptCompletion, completionStatus, startCompletion, type Completion, type CompletionContext } from "@codemirror/autocomplete";
import { indentLess, indentMore, insertNewlineAndIndent } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { pythonLanguage } from "@codemirror/lang-python";
import { EditorState, Prec, type Extension } from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";

const INDENT = "    ";

const fn = (label: string, info: string): Completion => ({ label, type: "method", info, apply: `${label}()`, boost: 2 });
const prop = (label: string, info: string): Completion => ({ label, type: "property", info, boost: 1 });

// What a fighter can use on itself (inherited from Fighter)
const SELF: Completion[] = [
  fn("strike", "Reliable hit: about power − enemy defense"),
  fn("heavy_strike", "2× power, but only 40% to hit"),
  fn("guard", "Take half damage; your next attack hits +50%"),
  fn("heal", "+20% max HP (3 potions per battle)"),
  prop("hp", "Current HP (read-only)"),
  prop("max_hp", "Max HP"),
  prop("hp_percent", "HP as a percentage, 0–100"),
  prop("potions", "Heal potions left"),
  prop("power", "Your power stat"),
  prop("defense", "Your defense stat"),
  prop("speed", "Your speed stat"),
  prop("name", "Your fighter's name"),
  prop("is_alive", "True while HP > 0"),
  { label: "__init__", type: "method", info: "super().__init__(name=..., hp=..., power=..., defense=..., speed=...)" },
];

// What choose_move gets to see about the opponent (read-only EnemyInfo)
const ENEMY: Completion[] = [
  prop("hp", "Enemy's current HP"),
  prop("max_hp", "Enemy's max HP"),
  prop("hp_percent", "Enemy HP as a percentage"),
  prop("power", "Enemy power"),
  prop("defense", "Enemy defense (high? try heavy_strike)"),
  prop("speed", "Enemy speed"),
  prop("potions", "Enemy potions left"),
  prop("guarding", "True if the enemy guarded last turn"),
  prop("last_move", '"strike", "heavy", "guard", "heal", ...'),
  prop("name", "Enemy name"),
];

const SNIPPETS: Completion[] = [
  { label: "super().__init__", type: "function", info: "Run Fighter's setup with your stats", apply: 'super().__init__(name="", hp=100, power=10, defense=10, speed=10)' },
  { label: "Fighter", type: "class", info: "The abstract base class every fighter inherits from" },
];

function arenaCompletions(ctx: CompletionContext) {
  const member = ctx.matchBefore(/\b(self|enemy)\.\w*$/);
  if (member) {
    const dot = member.text.indexOf(".");
    const list = member.text.startsWith("self") ? SELF : ENEMY;
    return { from: member.from + dot + 1, options: list, validFor: /^\w*$/ };
  }
  const word = ctx.matchBefore(/\w+$/);
  if (!word || (word.from === word.to && !ctx.explicit)) return null;
  return { from: word.from, options: SNIPPETS, validFor: /^\w*$/ };
}

/** Tab: accept an open suggestion, otherwise indent. Shift-Tab: dedent. */
function tab(view: EditorView) {
  if (completionStatus(view.state) === "active") return acceptCompletion(view);
  const sel = view.state.selection.main;
  if (sel.empty) {
    // Typed part of a name (e.g. "self.str") and the list hasn't popped up yet:
    // finish it if there's only one match, otherwise open the list.
    const line = view.state.doc.lineAt(sel.head);
    const before = line.text.slice(0, sel.head - line.from);
    const m = /\b(self|enemy)\.(\w*)$/.exec(before);
    if (m) {
      const list = m[1] === "self" ? SELF : ENEMY;
      const hits = list.filter((c) => c.label.startsWith(m[2]));
      if (hits.length === 1) {
        const insert = (typeof hits[0].apply === "string" ? hits[0].apply : hits[0].label).slice(m[2].length);
        view.dispatch(view.state.update({ changes: { from: sel.head, insert }, selection: { anchor: sel.head + insert.length }, userEvent: "input.complete" }));
        return true;
      }
      if (hits.length > 1) return startCompletion(view);
    } else if (/\w$/.test(before)) {
      return startCompletion(view);
    }
    // insert spaces up to the next 4-column stop (like Python editors do)
    const col = sel.head - line.from;
    const spaces = 4 - (col % 4);
    view.dispatch(view.state.update({ changes: { from: sel.head, insert: " ".repeat(spaces) }, selection: { anchor: sel.head + spaces }, scrollIntoView: true, userEvent: "input" }));
    return true;
  }
  return indentMore(view);
}

/** Enter: normal smart indent, but step back a level after a line that ends a block
 *  (return / pass / break / continue / raise), like Python's own IDLE editor. */
function enter(view: EditorView) {
  const { state } = view;
  const sel = state.selection.main;
  if (!sel.empty) return insertNewlineAndIndent(view);
  const line = state.doc.lineAt(sel.head);
  const before = line.text.slice(0, sel.head - line.from);
  const ender = /^\s*(return\b.*|pass|break|continue|raise\b.*)\s*$/.test(before);
  if (!ender || sel.head !== line.to) return insertNewlineAndIndent(view);
  const indent = /^\s*/.exec(line.text)![0].replace(/\t/g, INDENT).length;
  const next = " ".repeat(Math.max(0, indent - INDENT.length));
  view.dispatch(state.update({ changes: { from: sel.head, insert: "\n" + next }, selection: { anchor: sel.head + 1 + next.length }, scrollIntoView: true, userEvent: "input" }));
  return true;
}

export function pythonEditorExtensions(): Extension[] {
  return [
    // highest precedence so the editor's default 2-space setting can't win
    Prec.highest([indentUnit.of(INDENT), EditorState.tabSize.of(4)]),
    pythonLanguage.data.of({ autocomplete: arenaCompletions }),
    Prec.high(
      keymap.of([
        { key: "Tab", run: tab, shift: indentLess },
        { key: "Enter", run: enter },
      ]),
    ),
  ];
}
