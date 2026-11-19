"""Tests for the arena engine, task harness, and reference solutions."""
import json
import os
import sys
import unittest

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "client", "src", "python")
sys.path.insert(0, os.path.abspath(ROOT))

import arena  # noqa: E402
import harness  # noqa: E402


def task_file(name):
    with open(os.path.join(ROOT, "tasks", name), encoding="utf-8") as fh:
        return fh.read()


GOOD = task_file("polymorphism_solution.py")


class FighterTests(unittest.TestCase):
    def test_budget_enforced(self):
        class Greedy(arena.Fighter):
            def __init__(self):
                super().__init__(name="Greedy", hp=200, power=25, defense=15, speed=20)

            def choose_move(self, enemy):
                return self.strike()

        with self.assertRaises(ValueError):
            Greedy()

    def test_hp_read_only(self):
        f = arena.TrainingDummyBot()
        with self.assertRaises(AttributeError):
            f.hp = 9999

    def test_abstract(self):
        with self.assertRaises(TypeError):
            arena.Fighter()


class ArenaTests(unittest.TestCase):
    def test_battle_has_winner_and_is_deterministic(self):
        a = arena.Arena(seed=7).battle(arena.IronTank(), arena.StormMage())
        b = arena.Arena(seed=7).battle(arena.IronTank(), arena.StormMage())
        self.assertIn(a["winner"], (0, 1))
        self.assertEqual(a, b)
        self.assertEqual(a["fighters"][0]["sprite"], "golem")
        self.assertEqual(a["fighters"][1]["cls"], "StormMage")

    def test_self_hp_cheat_has_no_effect(self):
        class Cheater(arena.Fighter):
            def __init__(self):
                super().__init__(name="Cheater", hp=60, power=1, defense=0, speed=1)

            def choose_move(self, enemy):
                self._hp = 9999
                return self.guard()

        result = arena.Arena(seed=1, max_turns=200).battle(Cheater(), arena.StormMage())
        self.assertEqual(result["winner"], 1)
        self.assertEqual(result["reason"], "ko")

    def test_stat_tampering_caught(self):
        class Tamper(arena.Fighter):
            def __init__(self):
                super().__init__(name="T", hp=100, power=10, defense=5, speed=5)
                self._power = 99

            def choose_move(self, enemy):
                return self.strike()

        with self.assertRaises(ValueError):
            arena.Arena().battle(Tamper(), arena.IronTank())

    def test_enemy_info_is_read_only(self):
        info = arena.EnemyInfo("x", 1, 1, 1, 1, 1, 0, False, "none")
        with self.assertRaises(Exception):
            info.hp = 0

    def test_crash_and_infinite_loop_are_fumbles(self):
        class Crashy(arena.Fighter):
            def choose_move(self, enemy):
                return 1 / 0

        class Loopy(arena.Fighter):
            def choose_move(self, enemy):
                while True:
                    pass

        r = arena.Arena(max_turns=4).battle(Crashy(), Loopy())
        errors = [t["error"] for t in r["turns"]]
        self.assertTrue(any("ZeroDivisionError" in e for e in errors))
        self.assertTrue(any("Timeout" in e for e in errors))

    def test_turn_cap_decision(self):
        class Turtle(arena.Fighter):
            def choose_move(self, enemy):
                return self.guard()

        r = arena.Arena(max_turns=10).battle(Turtle(), Turtle())
        self.assertEqual(r["reason"], "decision")
        self.assertEqual(len(r["turns"]), 10)


class TournamentTests(unittest.TestCase):
    def entries(self, n):
        return [{"id": f"p{i}", "player": f"P{i}", "code": GOOD.replace("Ember", f"Ember{i}")} for i in range(n)]

    def test_byes_and_champion(self):
        for n in (1, 2, 3, 5, 8, 13):
            result = arena.run_tournament(self.entries(n), seed=3)
            self.assertEqual(len(result["fighters"]), n)
            self.assertIsNotNone(result["champion"], n)
            for rnd in result["rounds"]:
                for m in rnd:
                    self.assertFalse(m["a"] is None and m["b"] is None, f"bye vs bye with n={n}")

    def test_disqualifies_broken_and_hanging_code(self):
        entries = self.entries(3) + [
            {"id": "bad", "player": "Bad", "code": "this is not python"},
            {"id": "hang", "player": "Hang", "code": "while True:\n    pass"},
            {"id": "none", "player": "None", "code": "x = 1"},
        ]
        result = arena.run_tournament(entries, seed=1)
        dq = {d["id"] for d in result["disqualified"]}
        self.assertEqual(dq, {"bad", "hang", "none"})
        self.assertEqual(len(result["fighters"]), 3)
        json.dumps(result)


class HarnessTests(unittest.TestCase):
    def run_task(self, code_file, tests_file):
        return json.loads(harness.run_task(task_file(code_file), task_file(tests_file)))

    def test_solutions_pass_and_starters_fail(self):
        for task in ("encapsulation", "abstraction", "inheritance", "polymorphism"):
            solution = self.run_task(f"{task}_solution.py", f"{task}_tests.py")
            self.assertIsNone(solution["error"], task)
            failed = [t for t in solution["tests"] if not t["passed"]]
            self.assertEqual(failed, [], task)
            starter_name = f"{task}_starter.py" if task != "polymorphism" else "inheritance_solution.py"
            starter = self.run_task(starter_name, f"{task}_tests.py")
            passed = starter["error"] is None and all(t["passed"] for t in starter["tests"])
            self.assertFalse(passed, f"{task} starter should not pass")

    def test_friendly_hints(self):
        out = json.loads(harness.run_task(task_file("inheritance_starter.py"), task_file("inheritance_tests.py")))
        self.assertIn("super().__init__", out["error"]["hint"])
        out = json.loads(harness.run_task("class A:\n  def f(self)\n    pass", "def test_x(ns):\n  pass"))
        self.assertEqual(out["error"]["line"], 2)

    def test_practice(self):
        out = json.loads(harness.practice(GOOD))
        self.assertIsNone(out["error"])
        self.assertEqual(len(out["battles"]), 3)


if __name__ == "__main__":
    unittest.main()
