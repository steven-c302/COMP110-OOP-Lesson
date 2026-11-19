"""OOP Arena engine.

Students subclass `Fighter` and implement `choose_move`. The `Arena` runs
battles between any two fighters without knowing their concrete classes
(polymorphism). The arena keeps its own authoritative copy of every fighter's
HP and potions, so overriding properties or poking at `_hp` cannot cheat the
tournament (encapsulation, enforced by the referee).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
import random
import sys

STAT_BUDGET = 40
STAT_LIMITS = {
    "hp": (50, 200),
    "power": (1, 25),
    "defense": (0, 15),
    "speed": (1, 20),
}
MAX_POTIONS = 3
MAX_TURNS = 60
STEP_LIMIT = 200_000  # traced Python events allowed when loading student code
MOVE_STEP_LIMIT = 50_000  # per choose_move() call: plenty for any real strategy
MAX_TIMEOUTS = 2  # after this many timeouts in one battle, a fighter is benched
MOVE_KINDS = ("strike", "heavy", "guard", "heal")
SPRITES = ("knight", "mage", "rogue", "golem", "slime", "dragon", "skeleton", "archer")


# --------------------------------------------------------------------------
# Moves
# --------------------------------------------------------------------------
class Move:
    """What a fighter wants to do this turn. The arena decides what happens."""

    __slots__ = ("kind",)

    def __init__(self, kind):
        self.kind = kind

    def __repr__(self):
        return f"Move({self.kind!r})"

    def __eq__(self, other):
        return isinstance(other, Move) and other.kind == self.kind

    def __hash__(self):
        return hash(self.kind)


@dataclass(frozen=True)
class EnemyInfo:
    """A read-only snapshot of your opponent. You can look, but not touch."""

    name: str
    hp: int
    max_hp: int
    power: int
    defense: int
    speed: int
    potions: int
    guarding: bool
    last_move: str

    @property
    def hp_percent(self):
        return round(100 * self.hp / self.max_hp)


# --------------------------------------------------------------------------
# The abstract base class every fighter inherits from
# --------------------------------------------------------------------------
class Fighter(ABC):
    """Base class for every fighter in the arena.

    Subclasses MUST implement `choose_move(self, enemy)` and return one of
    self.strike(), self.heavy_strike(), self.guard(), self.heal().
    """

    SPRITE = "knight"  # one of: knight mage rogue golem slime dragon skeleton archer

    def __init__(self, name="Fighter", hp=100, power=10, defense=5, speed=5):
        stats = {"hp": hp, "power": power, "defense": defense, "speed": speed}
        for stat, value in stats.items():
            if not isinstance(value, int) or isinstance(value, bool):
                raise ValueError(f"{stat} must be a whole number, got {value!r}")
            low, high = STAT_LIMITS[stat]
            if not low <= value <= high:
                raise ValueError(f"{stat} must be between {low} and {high}, got {value}")
        cost = stat_cost(hp, power, defense, speed)
        if cost > STAT_BUDGET:
            raise ValueError(
                f"Over budget! hp//10 + power + defense + speed = {cost}, "
                f"but the limit is {STAT_BUDGET}"
            )
        self._name = str(name)[:24] or "Fighter"
        self._max_hp = hp
        self._hp = hp
        self._power = power
        self._defense = defense
        self._speed = speed
        self._potions = MAX_POTIONS

    # ---- read-only stats (encapsulation) ---------------------------------
    @property
    def name(self):
        return self._name

    @property
    def hp(self):
        return self._hp

    @property
    def max_hp(self):
        return self._max_hp

    @property
    def power(self):
        return self._power

    @property
    def defense(self):
        return self._defense

    @property
    def speed(self):
        return self._speed

    @property
    def potions(self):
        return self._potions

    @property
    def hp_percent(self):
        return round(100 * self._hp / self._max_hp)

    @property
    def is_alive(self):
        return self._hp > 0

    def take_damage(self, amount):
        """The only way HP goes down. Never below zero, never negative damage."""
        if amount > 0:
            self._hp = max(0, self._hp - amount)

    def restore(self, amount):
        if amount > 0:
            self._hp = min(self._max_hp, self._hp + amount)

    # ---- moves every fighter inherits -----------------------------------
    def strike(self):
        """Reliable hit for about `power` damage."""
        return Move("strike")

    def heavy_strike(self):
        """Double damage, but only a 40% chance to hit. Great against high defense."""
        return Move("heavy")

    def guard(self):
        """Halve damage you take until your next turn, and charge up: your next attack deals +50%."""
        return Move("guard")

    def heal(self):
        """Drink a potion: restore 20% of max HP. Only 3 per battle."""
        return Move("heal")

    # ---- what subclasses customise --------------------------------------
    @abstractmethod
    def choose_move(self, enemy):
        """Look at `enemy` (an EnemyInfo) and return a Move."""

    def battle_cry(self):
        return "..."

    def describe(self):
        return (
            f"{self.name} the {self.SPRITE}: {self.hp}/{self.max_hp} HP, "
            f"power {self.power}, defense {self.defense}, speed {self.speed}"
        )


def stat_cost(hp, power, defense, speed):
    return hp // 10 + power + defense + speed


# --------------------------------------------------------------------------
# House bots (practice opponents)
# --------------------------------------------------------------------------
class IronTank(Fighter):
    SPRITE = "golem"

    def __init__(self):
        super().__init__(name="Iron Tank", hp=150, power=8, defense=12, speed=5)
        self._just_guarded = False

    def choose_move(self, enemy):
        if self.hp_percent < 35 and self.potions > 0:
            return self.heal()
        # Guard against a heavy hitter, but never twice in a row: a guard
        # charges the next attack, so cash it in (and avoid stalling forever).
        if enemy.last_move == "heavy" and not self._just_guarded:
            self._just_guarded = True
            return self.guard()
        self._just_guarded = False
        return self.strike()

    def battle_cry(self):
        return "You'll have to get through me first."


class StormMage(Fighter):
    SPRITE = "mage"

    def __init__(self):
        super().__init__(name="Storm Mage", hp=80, power=18, defense=4, speed=10)

    def choose_move(self, enemy):
        if self.hp_percent < 30 and self.potions > 0:
            return self.heal()
        if enemy.defense >= 8:
            return self.heavy_strike()
        return self.strike()

    def battle_cry(self):
        return "Feel the storm!"


class ShadowRogue(Fighter):
    SPRITE = "rogue"

    def __init__(self):
        super().__init__(name="Shadow Rogue", hp=90, power=14, defense=3, speed=14)

    def choose_move(self, enemy):
        if enemy.guarding:
            return self.heal() if self.potions and self.hp_percent < 60 else self.strike()
        if enemy.hp_percent < 30:
            return self.heavy_strike()
        return self.strike()

    def battle_cry(self):
        return "You won't even see me coming."


class TrainingDummyBot(Fighter):
    SPRITE = "slime"

    def __init__(self):
        super().__init__(name="Training Dummy", hp=100, power=5, defense=5, speed=1)

    def choose_move(self, enemy):
        return self.strike()


HOUSE_BOTS = [IronTank, StormMage, ShadowRogue]


# --------------------------------------------------------------------------
# Sandboxing helpers for student code
# --------------------------------------------------------------------------
class StepLimitExceeded(BaseException):
    """Raised when student code runs too long (probably an infinite loop)."""


BLOCKED_MODULES = ("js", "pyodide", "pyodide_js", "pyodide.ffi")


def guarded_call(fn, *args, limit=STEP_LIMIT):
    """Call fn(*args) but abort if it executes more than `limit` traced events.

    While student code runs, Pyodide's JS bridge modules are hidden so the
    code can't reach the browser.
    """
    count = [0]

    def tracer(frame, event, arg):
        count[0] += 1
        if count[0] > limit:
            raise StepLimitExceeded("took too long. Is there an infinite loop?")
        return tracer

    saved = {name: sys.modules.get(name, _MISSING) for name in BLOCKED_MODULES}
    for name in BLOCKED_MODULES:
        sys.modules[name] = None
    previous = sys.gettrace()
    sys.settrace(tracer)
    try:
        return fn(*args)
    finally:
        sys.settrace(previous)
        for name, module in saved.items():
            if module is _MISSING:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module


_MISSING = object()


def short_error(exc):
    if isinstance(exc, StepLimitExceeded):
        return "Timeout: took too long. Is there an infinite loop?"
    text = f"{type(exc).__name__}: {exc}"
    return text[:120]


def load_fighter_class(code, module_name="student_fighter", filename=None):
    """Exec student code and return the Fighter subclass it defines."""
    namespace = {"__name__": module_name}
    guarded_call(exec, compile(code, filename or f"<{module_name}>", "exec"), namespace)
    classes = [
        value
        for value in namespace.values()
        if isinstance(value, type)
        and issubclass(value, Fighter)
        and value is not Fighter
        and value.__module__ == module_name
    ]
    if not classes:
        raise ValueError("No class that inherits from Fighter was found")
    return classes[-1]


# --------------------------------------------------------------------------
# The arena: runs a battle between ANY two fighters (polymorphism)
# --------------------------------------------------------------------------
class _Corner:
    """The referee's private, authoritative record of one fighter."""

    def __init__(self, fighter):
        if not all(hasattr(fighter, a) for a in ("_name", "_max_hp", "_power", "_defense", "_speed")):
            raise ValueError("Missing stats. Did you forget to call super().__init__(...)?")
        # The referee re-checks the stats: setting self._power = 99 after
        # super().__init__() is caught here.
        try:
            stats = dict(hp=fighter._max_hp, power=fighter._power,
                         defense=fighter._defense, speed=fighter._speed)
            for stat, value in stats.items():
                low, high = STAT_LIMITS[stat]
                if not isinstance(value, int) or isinstance(value, bool) or not low <= value <= high:
                    raise ValueError
            if stat_cost(**stats) > STAT_BUDGET:
                raise ValueError
        except ValueError:
            raise ValueError("The referee caught tampered stats! Set them only through super().__init__()")
        self.fighter = fighter
        self.name = str(fighter._name)[:24]
        self.max_hp = fighter._max_hp
        self.hp = fighter._max_hp
        self.power = fighter._power
        self.defense = fighter._defense
        self.speed = fighter._speed
        self.potions = MAX_POTIONS
        self.guarding = False
        self.charged = False
        self.timeouts = 0
        self.last_move = "none"
        sprite = getattr(type(fighter), "SPRITE", "knight")
        self.sprite = sprite if sprite in SPRITES else "knight"
        self.cls = type(fighter).__name__[:32]

    def info(self):
        return EnemyInfo(
            name=self.name,
            hp=self.hp,
            max_hp=self.max_hp,
            power=self.power,
            defense=self.defense,
            speed=self.speed,
            potions=self.potions,
            guarding=self.guarding,
            last_move=self.last_move,
        )

    def sync(self):
        """Push the referee's truth back onto the fighter before it decides."""
        f = self.fighter
        try:
            f._hp, f._max_hp, f._potions = self.hp, self.max_hp, self.potions
            f._power, f._defense, f._speed = self.power, self.defense, self.speed
        except Exception:
            pass

    def summary(self):
        return {
            "name": self.name,
            "sprite": self.sprite,
            "cls": self.cls,
            "maxHp": self.max_hp,
            "power": self.power,
            "defense": self.defense,
            "speed": self.speed,
        }


def _cry(fighter):
    try:
        text = guarded_call(fighter.battle_cry, limit=20_000)
        return str(text)[:80] if text is not None else "..."
    except BaseException:
        return "..."


class Arena:
    def __init__(self, seed=0, max_turns=MAX_TURNS):
        self.rng = random.Random(seed)
        self.max_turns = max_turns

    def battle(self, fighter_a, fighter_b):
        corners = [_Corner(fighter_a), _Corner(fighter_b)]
        log = []
        result = {
            "fighters": [c.summary() for c in corners],
            "cries": [_cry(fighter_a), _cry(fighter_b)],
            "turns": log,
        }
        if corners[0].speed != corners[1].speed:
            first = 0 if corners[0].speed > corners[1].speed else 1
        else:
            first = self.rng.randint(0, 1)
        result["first"] = first

        actor = first
        for turn in range(self.max_turns):
            me, them = corners[actor], corners[1 - actor]
            me.guarding = False
            entry = self._take_turn(actor, me, them)
            entry["t"] = turn
            entry["hp"] = [corners[0].hp, corners[1].hp]
            log.append(entry)
            if them.hp <= 0:
                result["winner"] = actor
                result["reason"] = "ko"
                return result
            actor = 1 - actor

        pct = [c.hp / c.max_hp for c in corners]
        if pct[0] != pct[1]:
            result["winner"] = 0 if pct[0] > pct[1] else 1
        elif corners[0].speed != corners[1].speed:
            result["winner"] = 0 if corners[0].speed > corners[1].speed else 1
        else:
            result["winner"] = self.rng.randint(0, 1)
        result["reason"] = "decision"
        return result

    def _take_turn(self, actor, me, them):
        entry = {"actor": actor, "move": "fumble", "dmg": 0, "heal": 0,
                 "hit": False, "dodged": False, "error": None}
        if me.timeouts >= MAX_TIMEOUTS:
            entry["error"] = "Benched: choose_move() kept timing out"
            me.last_move = "fumble"
            return entry
        me.sync()
        try:
            move = guarded_call(me.fighter.choose_move, them.info(), limit=MOVE_STEP_LIMIT)
        except BaseException as exc:  # student code crashed or hung
            if isinstance(exc, StepLimitExceeded):
                me.timeouts += 1
            entry["error"] = short_error(exc)
            me.last_move = "fumble"
            return entry

        kind = move.kind if isinstance(move, Move) else None
        if kind not in MOVE_KINDS:
            entry["error"] = f"choose_move returned {move!r:.40}, not a Move"
            me.last_move = "fumble"
            return entry
        if kind == "heal" and me.potions <= 0:
            entry["error"] = "Out of potions!"
            me.last_move = "fumble"
            return entry

        entry["move"] = kind
        me.last_move = kind
        rng = self.rng

        if kind == "guard":
            me.guarding = True
            me.charged = True
        elif kind == "heal":
            me.potions -= 1
            amount = min(me.max_hp - me.hp, max(1, me.max_hp // 5))
            me.hp += amount
            entry["heal"] = amount
        else:
            was_charged = me.charged
            dodge_chance = min(0.25, them.speed * 0.012)
            if kind == "heavy" and rng.random() > 0.40:
                entry["hit"] = False  # whiffed
            elif rng.random() < dodge_chance:
                entry["dodged"] = True
            else:
                if kind == "strike":
                    raw = me.power + rng.randint(-2, 2)
                else:
                    raw = me.power * 2 + rng.randint(-3, 3)
                if me.charged:
                    raw = raw * 3 // 2
                    entry["charged"] = True
                dmg = max(1, raw - them.defense)
                if them.guarding:
                    dmg = max(1, dmg // 2)
                dmg = min(dmg, them.hp)
                them.hp -= dmg
                entry["hit"] = True
                entry["dmg"] = dmg
                entry["guarded"] = them.guarding
            if was_charged:
                me.charged = False
        return entry


# --------------------------------------------------------------------------
# Tournament
# --------------------------------------------------------------------------
def build_entry(entry):
    """Load + pre-screen one submission. Returns (fighter_factory, error)."""
    try:
        cls = load_fighter_class(entry["code"], f"fighter_{entry['id']}")
        guarded_call(cls)  # must construct with no arguments
        probe = Arena(seed=1).battle(guarded_call(cls), TrainingDummyBot())
        crashes = [t["error"] for t in probe["turns"] if t["actor"] == 0 and t["error"]]
        if crashes and len(crashes) == len([t for t in probe["turns"] if t["actor"] == 0]):
            raise RuntimeError(crashes[0])
        return cls, None
    except BaseException as exc:
        return None, short_error(exc)


def run_tournament(entries, seed=0):
    """entries: [{"id", "player", "code"}] -> JSON-able tournament result."""
    rng = random.Random(seed)
    roster, disqualified = [], []
    for entry in entries:
        cls, error = build_entry(entry)
        if error:
            disqualified.append({"id": entry["id"], "player": entry.get("player", "?"), "error": error})
            continue
        sample = guarded_call(cls)
        corner = _Corner(sample)
        roster.append({
            "id": entry["id"],
            "player": entry.get("player", "?"),
            "factory": cls,
            **corner.summary(),
            "cry": _cry(sample),
        })

    rng.shuffle(roster)
    size = 1
    while size < max(2, len(roster)):
        size *= 2
    # Spread byes so no bye plays a bye
    slots = [None] * size
    order = _seed_order(size)
    for i, fighter in enumerate(roster):
        slots[order[i]] = fighter

    rounds = []
    current = slots
    arena_seed = rng.randint(0, 10**9)
    match_no = 0
    while len(current) > 1:
        matches, nxt = [], []
        for i in range(0, len(current), 2):
            a, b = current[i], current[i + 1]
            match = {"a": a["id"] if a else None, "b": b["id"] if b else None}
            if a and b:
                arena = Arena(seed=arena_seed + match_no)
                match_no += 1
                battle = arena.battle(guarded_call(a["factory"]), guarded_call(b["factory"]))
                winner = a if battle["winner"] == 0 else b
                match["battle"] = battle
                match["winner"] = winner["id"]
            elif a or b:
                winner = a or b
                match["winner"] = winner["id"]
                match["bye"] = True
            else:
                winner = None
                match["winner"] = None
                match["bye"] = True
            matches.append(match)
            nxt.append(winner)
        rounds.append(matches)
        current = nxt

    champion = current[0]["id"] if current and current[0] else None
    return {
        "fighters": [{k: v for k, v in f.items() if k != "factory"} for f in roster],
        "disqualified": disqualified,
        "rounds": rounds,
        "champion": champion,
    }


def _seed_order(size):
    """Standard bracket placement: 0, size-1, ... so byes spread across the bracket."""
    order = [0]
    while len(order) < size:
        n = len(order) * 2
        order = [x for pair in ((o, n - 1 - o) for o in order) for x in pair]
    # Fill top seeds first; positions of seeds 0..k-1 are order.index(k)
    positions = [0] * size
    for slot, seed in enumerate(order):
        positions[seed] = slot
    return positions
