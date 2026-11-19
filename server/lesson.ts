// The whole lesson, in order. Edit this file to change slides, questions, or timing.
// It lives on the server so quiz answers never reach students' browsers early.
import type { Step } from "../shared/types.ts";
import { SPEAKER_NOTES } from "./speaker-notes.ts";

const STEPS: Step[] = [
  {
    id: "lobby",
    type: "lobby",
    minutes: 2,
  },
  {
    id: "title",
    type: "slide",
    layout: "title",
    minutes: 0.5,
    kicker: "Live session · The Four Pillars of OOP",
    title: "OOP ARENA",
    subtitle: "Last time you built classes. Today you build a fighter that has to survive the arena, and every pillar is a rule that keeps it alive.",
  },
  {
    id: "hook",
    type: "slide",
    layout: "split",
    minutes: 1,
    kicker: "The problem",
    title: "One line to beat the final boss",
    code: `class Boss:
    def __init__(self):
        self.hp = 500

boss = Boss()
boss.hp = 0        # 💀 one line. boss defeated.
print("You win!")`,
    bullets: [
      "Nothing stops anyone from editing hp",
      "In our tournament, everyone's code runs together",
      "We need rules the code itself can't cheat",
    ],
  },
  {
    id: "hook-poll",
    type: "quiz",
    kind: "poll",
    label: "Warm-up poll · no points",
    prompt: "How would YOU stop someone from writing boss.hp = 0?",
    choices: [
      "Hide hp so it can't be changed directly",
      "Have a referee check hp every turn",
      "Trust everyone 🙏",
      "Delete the hp attribute",
    ],
    seconds: 20,
    readSeconds: 3,
  },
  {
    id: "pillars",
    type: "slide",
    layout: "pillars",
    minutes: 1,
    kicker: "Today's map",
    title: "The Four Pillars",
    subtitle: "Each one solves a real problem for the arena.",
  },

  // ------------------------------------------------------------ ENCAPSULATION
  {
    id: "enc-intro",
    type: "slide",
    layout: "pillar",
    pillar: "encapsulation",
    minutes: 0.5,
    title: "Encapsulation",
    subtitle: "Bundle data with the methods that guard it. Outsiders have to use the front door.",
    bullets: ["Problem it solves: boss.hp = 0"],
  },
  {
    id: "enc-code",
    type: "slide",
    layout: "split",
    pillar: "encapsulation",
    minutes: 2,
    kicker: "Encapsulation",
    title: "Lock the vault",
    code: `class Knight:
    def __init__(self, max_hp):
        self._hp = max_hp      # _ means "private: hands off"

    @property
    def hp(self):              # a read-only window
        return self._hp

    def take_damage(self, amount):
        if amount > 0:         # the ONLY way hp goes down
            self._hp = max(0, self._hp - amount)`,
    bullets: [
      "_hp: Python's convention for \"private\"",
      "@property: read it like an attribute; no setter means read-only",
      "take_damage() is the front door, and it enforces the rules",
    ],
  },
  {
    id: "enc-q1",
    type: "quiz",
    kind: "choice",
    pillar: "encapsulation",
    label: "Predict the output",
    prompt: "Using the Knight class, what prints?",
    code: `k = Knight(100)
k.take_damage(30)
k.take_damage(-50)
k.take_damage(500)
print(k.hp)`,
    choices: ["0", "-480", "20", "70"],
    correct: 0,
    explain: "-50 is ignored by the amount > 0 check, and max(0, ...) stops hp from going negative. 100 → 70 → 70 → 0.",
    seconds: 30,
  },
  {
    id: "enc-q2",
    type: "quiz",
    kind: "choice",
    pillar: "encapsulation",
    label: "What happens?",
    prompt: "Someone tries to cheat:",
    code: `k = Knight(100)
k.hp = 9999`,
    choices: ["hp becomes 9999", "AttributeError: property has no setter", "hp silently stays 100", "SyntaxError"],
    correct: 1,
    explain: "hp is a @property with no setter, so assigning to it raises AttributeError. The cheat fails loudly.",
    seconds: 25,
  },
  {
    id: "enc-task",
    type: "code",
    pillar: "encapsulation",
    taskId: "encapsulation",
    minutes: 4,
    title: "Lock down the Knight",
    goal: "Make hp private and read-only, and make take_damage() and heal() enforce the rules.",
    hints: [
      "In __init__, write self._hp = max_hp and self._max_hp = max_hp, then delete self.hp = ...",
      "@property\ndef hp(self):\n    return self._hp\n\ntake_damage: if amount > 0: self._hp = max(0, self._hp - amount)",
    ],
    seconds: 240,
  },

  // ------------------------------------------------------------ ABSTRACTION
  {
    id: "abs-intro",
    type: "slide",
    layout: "pillar",
    pillar: "abstraction",
    minutes: 0.5,
    title: "Abstraction",
    subtitle: "Show WHAT something does and hide HOW. The arena only needs one promise: every fighter can choose_move().",
    bullets: ["Problem it solves: the arena can't know about 50 different classes"],
  },
  {
    id: "abs-code",
    type: "slide",
    layout: "split",
    pillar: "abstraction",
    minutes: 2,
    kicker: "Abstraction",
    title: "A contract, not a fighter",
    code: `from abc import ABC, abstractmethod

class Fighter(ABC):
    @abstractmethod
    def choose_move(self, enemy):
        """Every fighter MUST decide a move."""

    def strike(self): ...
    def heal(self): ...`,
    bullets: [
      "ABC = Abstract Base Class: a blueprint you can't build directly",
      "@abstractmethod: every subclass MUST implement it",
      "The arena calls choose_move() without caring how it works inside",
    ],
  },
  {
    id: "abs-q1",
    type: "quiz",
    kind: "choice",
    pillar: "abstraction",
    label: "What happens?",
    prompt: "Fighter is the abstract class above. What does this do?",
    code: `f = Fighter()`,
    choices: ["Creates a blank fighter", "TypeError: Can't instantiate abstract class", "Returns None", "NameError"],
    correct: 1,
    explain: "You can't create an object from a class that still has abstract methods. Only complete subclasses can be built.",
    seconds: 20,
  },
  {
    id: "abs-q2",
    type: "quiz",
    kind: "choice",
    pillar: "abstraction",
    label: "Think it through",
    prompt: "A subclass of Fighter forgets to define choose_move. When does Python complain?",
    choices: [
      "When the class is defined",
      "When you create an object from it",
      "Only when choose_move is called in battle",
      "Never",
    ],
    correct: 1,
    explain: "The check happens at instantiation: Rogue() raises TypeError. Defining the class is fine; building one isn't.",
    seconds: 25,
  },
  {
    id: "abs-task",
    type: "code",
    pillar: "abstraction",
    taskId: "abstraction",
    minutes: 2.5,
    title: "Build a Training Dummy",
    goal: "Try Fighter() and watch it fail. Then make TrainingDummy a complete class by implementing choose_move.",
    hints: [
      "Inside the class, replace pass with a method: def choose_move(self, enemy):",
      "def choose_move(self, enemy):\n    return self.guard()",
    ],
    seconds: 150,
  },
  {
    id: "lb-1",
    type: "leaderboard",
    title: "Halfway check-in",
    minutes: 0.5,
  },

  // ------------------------------------------------------------ INHERITANCE
  {
    id: "inh-intro",
    type: "slide",
    layout: "pillar",
    pillar: "inheritance",
    minutes: 0.5,
    title: "Inheritance",
    subtitle: "A child class gets everything the parent has, then adds or overrides. Write the HP logic once, and every fighter gets it.",
    bullets: ["Problem it solves: copy-pasting take_damage() into 50 classes"],
  },
  {
    id: "inh-code",
    type: "slide",
    layout: "split",
    pillar: "inheritance",
    minutes: 2,
    kicker: "Inheritance",
    title: "Your fighter IS-A Fighter",
    code: `class Mage(Fighter):
    SPRITE = "mage"

    def __init__(self):
        super().__init__(name="Ember", hp=80,
                         power=18, defense=4, speed=10)

    def choose_move(self, enemy):     # override
        if self.hp_percent < 30:
            return self.heal()        # inherited!
        return self.strike()          # inherited!`,
    bullets: [
      "class Mage(Fighter): a Mage IS-A Fighter",
      "super().__init__(...) runs the parent's setup: stats, HP, potions",
      "Override what's different and inherit the rest",
    ],
  },
  {
    id: "inh-rules",
    type: "slide",
    layout: "bullets",
    pillar: "inheritance",
    minutes: 1.5,
    kicker: "Arena rules",
    title: "Moves you inherit",
    bullets: [
      "self.strike(): reliable, about power − enemy defense",
      "self.heavy_strike(): 2× power but only 40% to hit; great vs high defense",
      "self.guard(): take half damage, and your next attack hits +50%",
      "self.heal(): +20% max HP, only 3 potions per battle",
      "Budget: hp//10 + power + defense + speed ≤ 40 · speed = first move + dodge chance",
    ],
  },
  {
    id: "inh-q1",
    type: "quiz",
    kind: "choice",
    pillar: "inheritance",
    label: "Predict the output",
    prompt: "What prints?",
    code: `class Fighter:
    def battle_cry(self):
        return "..."

class Rogue(Fighter):
    def battle_cry(self):
        return "Too slow!"

class Ninja(Rogue):
    pass

print(Ninja().battle_cry())`,
    choices: ["...", "Too slow!", "AttributeError", "None"],
    correct: 1,
    explain: "Python looks in Ninja first, then its parent Rogue, which overrides battle_cry. The nearest definition wins.",
    seconds: 25,
  },
  {
    id: "inh-q2",
    type: "quiz",
    kind: "choice",
    pillar: "inheritance",
    label: "Spot the bug",
    prompt: "What goes wrong?",
    code: `class Character:
    def __init__(self, name):
        self._name = name
        self._hp = 100
    @property
    def hp(self): return self._hp

class Tank(Character):
    def __init__(self, name):
        self.armor = 10

print(Tank("Rocky").hp)`,
    choices: ["Prints 100", "AttributeError: no attribute '_hp'", "TypeError: missing argument", "Prints 10"],
    correct: 1,
    explain: "Tank's __init__ replaces the parent's and never calls super().__init__(name), so _hp is never set.",
    seconds: 30,
  },
  {
    id: "inh-task",
    type: "code",
    pillar: "inheritance",
    taskId: "inheritance",
    minutes: 5,
    title: "Build YOUR fighter",
    goal: "Call super().__init__() with your stats and give choose_move a strategy that uses at least two different moves. This is the fighter that enters the tournament!",
    hints: [
      "super().__init__(name=\"Blaze\", hp=100, power=14, defense=6, speed=10)   # 10+14+6+10 = 40",
      "if self.hp_percent < 30 and self.potions > 0:\n    return self.heal()\nreturn self.strike()",
    ],
    seconds: 300,
  },
  {
    id: "lb-2",
    type: "leaderboard",
    title: "Leaderboard",
    minutes: 0.5,
  },

  // ------------------------------------------------------------ POLYMORPHISM
  {
    id: "poly-intro",
    type: "slide",
    layout: "pillar",
    pillar: "polymorphism",
    minutes: 0.5,
    title: "Polymorphism",
    subtitle: "Many forms, one interface. The arena calls fighter.choose_move() and each class answers in its own way.",
    bullets: ["Problem it solves: one arena that works for classes it has never seen"],
  },
  {
    id: "poly-code",
    type: "slide",
    layout: "split",
    pillar: "polymorphism",
    minutes: 2,
    kicker: "Polymorphism",
    title: "Same call, different behavior",
    code: `fighters = [IronTank(), StormMage(), YourFighter()]

for f in fighters:
    move = f.choose_move(enemy)   # same call...
    print(f.battle_cry())         # ...different answers`,
    bullets: [
      "The arena never checks type(f); it just calls the method",
      "Python picks the method from the object's class at runtime",
      "Your class plugs into an arena written before it existed",
    ],
  },
  {
    id: "poly-q1",
    type: "quiz",
    kind: "choice",
    pillar: "polymorphism",
    label: "Predict the output",
    prompt: "What prints?",
    code: `class Fighter:
    def cry(self): return "..."

class Mage(Fighter):
    def cry(self): return "Burn!"

class Tank(Fighter):
    pass

for f in [Mage(), Tank(), Fighter()]:
    print(f.cry(), end=" ")`,
    choices: ["Burn! ... ...", "Burn! Burn! Burn!", "... ... ...", "Burn! then AttributeError"],
    correct: 0,
    explain: "Same call each time. Mage uses its override; Tank inherits Fighter's version; Fighter uses its own.",
    seconds: 30,
  },
  {
    id: "poly-q2",
    type: "quiz",
    kind: "choice",
    pillar: "polymorphism",
    label: "Duck typing",
    prompt: "Duck doesn't inherit from Fighter. The arena just calls obj.choose_move(enemy). Does the call work?",
    code: `class Duck:
    def choose_move(self, enemy):
        return "quack"

arena_turn(Duck())`,
    choices: [
      "Yes, Python only cares that the method exists",
      "No, TypeError: not a Fighter",
      "No, SyntaxError",
      "Only if Duck is abstract",
    ],
    correct: 0,
    explain: "If it walks like a duck... Python's polymorphism is duck typing. (Our referee still checks the RETURN value is a Move, so 'quack' would fumble!)",
    seconds: 25,
  },
  {
    id: "poly-task",
    type: "code",
    pillar: "polymorphism",
    taskId: "polymorphism",
    carryFrom: "inheritance",
    submitFighter: true,
    minutes: 3,
    title: "Battle cry & enter the arena",
    goal: "Override battle_cry() so your fighter shouts something when the arena calls it. Then pass the checks and hit Submit to Arena!",
    hints: [
      "Add a method inside your class:\ndef battle_cry(self):\n    return \"...\"",
      "def battle_cry(self):\n    return \"You can't patch this bug!\"",
    ],
    seconds: 180,
  },
  {
    id: "tourney-rules",
    type: "slide",
    layout: "bullets",
    minutes: 0.5,
    kicker: "Final round",
    title: "The Tournament",
    bullets: [
      "Every student enters. No submission? You fight as a Rookie.",
      "Random bracket. Speed decides who strikes first.",
      "The arena only ever calls choose_move(): polymorphism, live",
      "500 pts per win · Champion +1500",
    ],
  },
  {
    id: "tournament",
    type: "tournament",
    minutes: 7,
  },
  {
    id: "exit-1",
    type: "quiz",
    kind: "choice",
    label: "Exit ticket · Name the pillar",
    prompt: "self._hp + a read-only @property so nobody can set hp directly",
    choices: ["Encapsulation", "Abstraction", "Inheritance", "Polymorphism"],
    correct: 0,
    seconds: 15,
    readSeconds: 2,
  },
  {
    id: "exit-2",
    type: "quiz",
    kind: "choice",
    label: "Exit ticket · Name the pillar",
    prompt: "class Mage(Fighter): gets take_damage() without writing it again",
    choices: ["Encapsulation", "Abstraction", "Inheritance", "Polymorphism"],
    correct: 2,
    seconds: 15,
    readSeconds: 2,
  },
  {
    id: "exit-3",
    type: "quiz",
    kind: "choice",
    label: "Exit ticket · Name the pillar",
    prompt: "for f in fighters: f.choose_move(enemy) works for every class",
    choices: ["Encapsulation", "Abstraction", "Inheritance", "Polymorphism"],
    correct: 3,
    seconds: 15,
    readSeconds: 2,
  },
  {
    id: "podium",
    type: "podium",
    minutes: 1.5,
  },
];

// Attach the TA speaker notes (server/speaker-notes.ts) to each step.
export const LESSON: Step[] = STEPS.map((s) => ({ ...s, speaker: SPEAKER_NOTES[s.id] }));
