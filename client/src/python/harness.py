"""Runs a student's code against a task's hidden tests, inside Pyodide.

Every public function returns a JSON string so the JS side can parse it.
"""

import io
import json
import sys
import traceback
from contextlib import redirect_stdout

import arena
from arena import guarded_call, short_error, StepLimitExceeded

STUDENT_FILE = "<your code>"


HINTS = [
    # (exception type name, substring of message, plain-English hint)
    ("AttributeError", "has no setter", "That attribute is read-only now (that's the point!). Inside the class, write to the private version instead, e.g. self._hp = ..."),
    ("AttributeError", "can't set attribute", "That attribute is read-only now (that's the point!). Inside the class, write to the private version instead, e.g. self._hp = ..."),
    ("AttributeError", "object has no attribute '_", "A private stat is missing. Did you forget to call super().__init__(...) in your __init__?"),
    ("AttributeError", "has no attribute", "Python can't find that attribute. Check the spelling, and remember attributes live on self (self.something)."),
    ("TypeError", "Can't instantiate abstract class", "This class is still abstract. Define every @abstractmethod, e.g. def choose_move(self, enemy):"),
    ("TypeError", "positional argument", "Wrong number of arguments. Did you forget self as the first parameter of a method?"),
    ("NameError", "", "Python doesn't know that name. Check the spelling. Inside a class, use self.name for attributes."),
    ("IndentationError", "", "The indentation is off. Code inside a class or def must be indented 4 spaces."),
    ("SyntaxError", "", "Python couldn't read this line. Look for a missing colon, bracket, or quote."),
    ("ValueError", "budget", "Your stats cost too much. Lower some stats until hp//10 + power + defense + speed <= 40."),
]


def _hint(exc):
    kind, text = type(exc).__name__, str(exc)
    for hint_kind, needle, hint in HINTS:
        if kind == hint_kind and needle in text:
            return hint
    return None


def _student_error(exc):
    """Friendly error pointing at the student's line, not the harness."""
    if isinstance(exc, StepLimitExceeded):
        return {"message": short_error(exc), "hint": "Look for a while loop that never ends."}
    line = None
    if isinstance(exc, SyntaxError) and exc.filename == STUDENT_FILE:
        line = exc.lineno
        text = f"{type(exc).__name__}: {exc.msg}"
    else:
        for frame in traceback.extract_tb(exc.__traceback__):
            if frame.filename == STUDENT_FILE:
                line = frame.lineno
        text = f"{type(exc).__name__}: {exc}"
    return {"message": f"Line {line}: {text}" if line else text, "hint": _hint(exc), "line": line}


def _load(student_code, out):
    ns = {"__name__": "student"}
    with redirect_stdout(out):
        guarded_call(exec, compile(student_code, STUDENT_FILE, "exec"), ns)
    return ns


def run_task(student_code, test_code):
    out = io.StringIO()
    try:
        ns = _load(student_code, out)
    except BaseException as exc:
        return json.dumps({"error": _student_error(exc), "stdout": out.getvalue()[-2000:], "tests": []})

    tests_ns = {"__name__": "tests", "arena": arena}
    exec(compile(test_code, "<tests>", "exec"), tests_ns)
    results = []
    for name, fn in list(tests_ns.items()):
        if not (name.startswith("test_") and callable(fn)):
            continue
        title = (fn.__doc__ or name[5:].replace("_", " ")).strip()
        try:
            with redirect_stdout(out):
                guarded_call(fn, ns)
            results.append({"name": title, "passed": True})
        except AssertionError as exc:
            results.append({"name": title, "passed": False, "message": str(exc) or "Not quite yet"})
        except BaseException as exc:
            err = _student_error(exc)
            results.append({"name": title, "passed": False, "message": err["message"], "hint": err["hint"]})
    return json.dumps({"error": None, "stdout": out.getvalue()[-2000:], "tests": results})


def practice(student_code, seed=0):
    """Battle the student's fighter against each house bot."""
    out = io.StringIO()
    try:
        with redirect_stdout(out):
            cls = arena.load_fighter_class(student_code, "student", STUDENT_FILE)
            battles = []
            for i, bot in enumerate(arena.HOUSE_BOTS):
                battles.append(arena.Arena(seed=seed + i).battle(guarded_call(cls), bot()))
        return json.dumps({"error": None, "battles": battles})
    except BaseException as exc:
        return json.dumps({"error": _student_error(exc), "battles": []})


def tournament(entries_json, seed=0):
    with redirect_stdout(io.StringIO()):
        return json.dumps(arena.run_tournament(json.loads(entries_json), seed))


def describe(student_code):
    """Summary card for a submitted fighter (name, sprite, stats, battle cry)."""
    out = io.StringIO()
    try:
        with redirect_stdout(out):
            cls = arena.load_fighter_class(student_code, "student", STUDENT_FILE)
            fighter = guarded_call(cls)
            corner = arena._Corner(fighter)
            card = corner.summary()
            card["cry"] = arena._cry(fighter)
        return json.dumps({"error": None, "card": card})
    except BaseException as exc:
        return json.dumps({"error": _student_error(exc), "card": None})
