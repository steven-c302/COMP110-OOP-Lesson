def test_abstract(ns):
    """Fighter itself can't be created (it's abstract)"""
    try:
        arena.Fighter()
    except TypeError:
        return
    raise AssertionError("Fighter() should fail")


def test_inherits(ns):
    """TrainingDummy inherits from Fighter"""
    cls = ns.get("TrainingDummy")
    assert cls is not None, "There's no class called TrainingDummy"
    assert issubclass(cls, arena.Fighter), "TrainingDummy must inherit: class TrainingDummy(Fighter):"


def test_instantiate(ns):
    """TrainingDummy() can be created"""
    try:
        ns["TrainingDummy"]()
    except TypeError as exc:
        if "abstract" in str(exc):
            raise AssertionError("Still abstract: you need to define choose_move(self, enemy)")
        raise


def test_returns_move(ns):
    """choose_move returns a real move"""
    dummy = ns["TrainingDummy"]()
    enemy = arena.EnemyInfo("Bot", 100, 100, 10, 5, 5, 3, False, "none")
    move = dummy.choose_move(enemy)
    assert isinstance(move, arena.Move), (
        f"choose_move returned {move!r}. Return self.strike(), self.guard(), self.heavy_strike() or self.heal()"
    )
