def _cls(ns):
    found = [v for v in ns.values() if isinstance(v, type) and issubclass(v, arena.Fighter)
             and v is not arena.Fighter and v.__module__ == "student"]
    assert found, "No class inherits from Fighter"
    return found[-1]


def test_valid(ns):
    """Still a valid fighter"""
    try:
        _cls(ns)()
    except ValueError as exc:
        raise AssertionError(str(exc))


def test_cry_override(ns):
    """battle_cry() is overridden"""
    cls = _cls(ns)
    assert cls.battle_cry is not arena.Fighter.battle_cry, "Define def battle_cry(self): in your class"


def test_cry_text(ns):
    """battle_cry() returns a short string (1-80 chars)"""
    cry = _cls(ns)().battle_cry()
    assert isinstance(cry, str), f"battle_cry returned {cry!r}. Return a string."
    assert 0 < len(cry.strip()) <= 80, f"Your battle cry is {len(cry)} characters; keep it 1-80"


def test_fights_everyone(ns):
    """Battles every house bot without crashing"""
    cls = _cls(ns)
    for i, bot in enumerate(arena.HOUSE_BOTS):
        result = arena.Arena(seed=i).battle(cls(), bot())
        errors = [t["error"] for t in result["turns"] if t["actor"] == 0 and t["error"]]
        assert not errors, f"Against {bot().name}: {errors[0]}"
