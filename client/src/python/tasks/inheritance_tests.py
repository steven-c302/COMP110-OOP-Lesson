SCENARIOS = [
    # (my hp %, enemy kwargs)
    (100, dict()),
    (20, dict()),
    (100, dict(guarding=True)),
    (100, dict(hp=10)),
    (50, dict(last_move="heavy")),
    (100, dict(defense=14)),
    (15, dict(hp=15, last_move="heavy")),
]


def _cls(ns):
    found = [v for v in ns.values() if isinstance(v, type) and issubclass(v, arena.Fighter)
             and v is not arena.Fighter and v.__module__ == "student"]
    assert found, "No class inherits from Fighter. Write class MyFighter(Fighter):"
    return found[-1]


def _make(ns):
    cls = _cls(ns)
    try:
        return cls()
    except ValueError as exc:
        raise AssertionError(str(exc))


def test_inherits(ns):
    """Your fighter inherits from Fighter"""
    _cls(ns)


def test_super(ns):
    """Calls super().__init__(...) so stats get set"""
    f = _make(ns)
    assert hasattr(f, "_max_hp"), "Stats are missing. Call super().__init__(name=..., hp=..., ...) in __init__"


def test_budget(ns):
    """Stats fit the budget (hp//10 + power + defense + speed <= 40)"""
    _make(ns)


def test_name(ns):
    """Your fighter has its own name"""
    f = _make(ns)
    assert f.name not in ("Fighter", ""), "Give your fighter a name: super().__init__(name=\"...\", ...)"


def test_strategy(ns):
    """choose_move uses at least two different moves"""
    f = _make(ns)
    kinds = set()
    for my_pct, enemy_kw in SCENARIOS:
        f._hp = max(1, f.max_hp * my_pct // 100)
        f._potions = 3
        info = dict(name="Bot", hp=100, max_hp=100, power=12, defense=5, speed=8,
                    potions=3, guarding=False, last_move="strike")
        info.update(enemy_kw)
        move = f.choose_move(arena.EnemyInfo(**info))
        assert isinstance(move, arena.Move), f"choose_move returned {move!r}, not a move like self.strike()"
        kinds.add(move.kind)
    assert len(kinds) >= 2, (
        f"Your fighter only ever uses {kinds.pop()}. Add an if statement, e.g. heal when self.hp_percent < 30"
    )
