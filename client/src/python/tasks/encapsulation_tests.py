def _knight(ns, hp=100):
    assert "Knight" in ns, "There's no class called Knight. Did you rename it?"
    return ns["Knight"]("Test Knight", hp)


def test_starts_full(ns):
    """A new Knight starts at full HP"""
    k = _knight(ns)
    assert k.hp == 100, f"Expected hp 100, got {k.hp!r}"


def test_read_only(ns):
    """knight.hp = 9999 is blocked (read-only property)"""
    k = _knight(ns)
    try:
        k.hp = 9999
    except AttributeError:
        return
    raise AssertionError("knight.hp = 9999 worked! Make hp a @property with no setter.")


def test_private(ns):
    """HP is stored in a private _attribute"""
    k = _knight(ns)
    assert "hp" not in vars(k), "hp is still a public attribute (self.hp = ...)"
    assert any(name.startswith("_") for name in vars(k)), "Store hp in an attribute that starts with _, like self._hp"


def test_damage(ns):
    """take_damage(30) lowers HP from 100 to 70"""
    k = _knight(ns)
    k.take_damage(30)
    assert k.hp == 70, f"Expected 70, got {k.hp!r}"


def test_floor(ns):
    """HP never drops below 0"""
    k = _knight(ns)
    k.take_damage(999)
    assert k.hp == 0, f"After take_damage(999) expected 0, got {k.hp!r}"


def test_negative(ns):
    """Negative damage can't sneak-heal you"""
    k = _knight(ns)
    k.take_damage(-50)
    assert k.hp == 100, f"take_damage(-50) changed hp to {k.hp!r}. Ignore negative amounts."


def test_heal_cap(ns):
    """heal() never goes above max HP"""
    k = _knight(ns)
    k.take_damage(10)
    k.heal(50)
    assert k.hp == 100, f"Expected 100 after healing past max, got {k.hp!r}"
