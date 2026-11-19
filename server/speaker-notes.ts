// Speaker notes for the TA, keyed by step id. Shown on /host (and the printable notes view).
// Never sent to students: they're attached to admin views only.
import type { SpeakerNotes } from "../shared/types.ts";

export const SPEAKER_NOTES: Record<string, SpeakerNotes> = {
  // ---------------------------------------------------------------- opening
  lobby: {
    say: [
      "“Open the link on the screen or scan the QR code. Pick any name you want, or hit the dice for a random one.”",
      "“Keep it classy: names show up on the big screen.”",
    ],
    doNow: [
      "Python (~6 MB) downloads on their laptops while they wait, so give it a minute.",
      "Start when most names are in. Late joiners are fine: they can join anytime and still play.",
      "Inappropriate name? Use ✎ Rename or ✕ Kick in the player list on the right.",
    ],
    next: "Title slide.",
  },
  title: {
    say: [
      "“Last time you built classes: attributes and methods. Today you'll build a fighter class, and at the end, everyone's code fights in a live tournament on this screen.”",
      "“There are points for quizzes and coding challenges, and the tournament can still flip the leaderboard.”",
    ],
    next: "The scenario: what we're building today.",
  },
  scenario: {
    say: [
      "“Here's the story. You've been hired to build fighters for a live coding arena, and the arena runs EVERYONE's code in one tournament.”",
      "“That's a trust problem: 50 people's classes, one game. Today's four missions each fix one piece of it, and each mission is one OOP pillar.”",
      "Point at the cards left to right: “Mission 1 protects HP, mission 2 sets the contract every fighter signs, mission 3 is YOUR fighter, mission 4 plugs it into the arena. Then: the tournament.”",
      "Point at the scoring chips: “Quizzes and challenges earn points, and the tournament pays out big, so nobody's out of it until the end.”",
    ],
    concept: "The missions build on each other. The Knight (encapsulation) teaches protected HP; the Training Dummy (abstraction) teaches the Fighter contract; YOUR fighter (inheritance) reuses Fighter's moves; the battle cry (polymorphism) shows the arena calling methods on classes it's never seen.",
    faq: [
      { q: "Do I need to know anything new to start?", a: "Only last session's classes and methods. Everything else we build together, and each challenge has hints." },
      { q: "What if my code doesn't work by the tournament?", a: "You still fight, as a default Rookie. Nobody sits out." },
    ],
    next: "Hook: the one-line cheat.",
  },
  hook: {
    say: [
      "Read the code out loud: “The boss has 500 HP… and one line sets it to zero. You win.”",
      "“In our arena, everyone's code runs together. If my fighter can set YOUR hp to zero, the game is broken.”",
    ],
    ask: ["“Has anyone used a cheat code in a game? That's exactly this.”", "“How would you stop this?” (leads into the poll)"],
    concept: "The point: plain attributes are a free-for-all. OOP gives us tools to protect data and set rules the code itself has to follow.",
    next: "Warm-up poll. No points, so everyone should answer.",
  },
  "hook-poll": {
    say: ["“No wrong answers, no points. Just tell me your instinct.”"],
    doNow: ["After the split shows: “Most of you picked hide it or a referee. Those are exactly the two things we'll build today.”"],
    concept: "Option A (hide it) is encapsulation. Option B (referee) is how the arena works: it keeps its own copy of HP. Trusting everyone is what plain attributes do now. Deleting hp breaks the game.",
    next: "The four pillars overview.",
  },
  pillars: {
    say: [
      "Point at each card: “Each pillar solves one real problem for our arena.”",
      "Encapsulation: “protect the data.” Abstraction: “agree on a contract.” Inheritance: “reuse the shared stuff.” Polymorphism: “one call, many behaviors.”",
      "“The bar at the top of the screen lights up as we unlock each one.”",
    ],
    next: "Encapsulation.",
  },

  // ---------------------------------------------------------------- encapsulation
  "enc-intro": {
    say: ["“Encapsulation means bundling data with the methods that guard it. Outsiders don't touch the data directly; they go through the front door.”"],
    concept: "Real-world analogy: a bank account. You can't edit your balance; you call deposit() and withdraw(), and the bank enforces the rules.",
    next: "Code: the Knight class.",
  },
  "enc-code": {
    say: [
      "Walk the code top to bottom. `_hp`: “the underscore means hands off. It's a convention between programmers.”",
      "`@property`: “this lets you READ k.hp like a normal attribute, but there's no setter, so writing to it fails.”",
      "`take_damage()`: “the only way HP goes down, and it enforces the rules: no negative damage, never below zero.”",
    ],
    concept: "Python has no truly private attributes. `_hp` is a convention; `__hp` (double underscore) only renames it (name mangling). The `@property` with no setter is what actually blocks `k.hp = 9999`.",
    watch: ["Students often think `_hp` alone makes it private. It doesn't: `k._hp = 9999` still works. It's a promise, not a lock."],
    faq: [
      { q: "Can't I still do k._hp = 9999?", a: "Yes, Python trusts you. The underscore says 'don't'. In our arena the referee keeps its own HP anyway, so it wouldn't help you." },
      { q: "Why not just a get_hp() method?", a: "You could (that's how Java does it). @property is the Pythonic way: it reads like an attribute but runs a method." },
    ],
    next: "Quiz: predict the output.",
  },
  "enc-q1": {
    say: ["“Trace it line by line. Pay attention to the -50.”"],
    answer: "A: 0. 100 → 70 (take 30) → 70 (-50 ignored by `if amount > 0`) → 0 (`max(0, ...)` clamps).",
    watch: [
      "20 means they let the -50 through as damage, or did 70 - 50.",
      "-480 means they forgot the max(0, ...) clamp.",
      "70 means they stopped tracing after the -50.",
    ],
    doNow: ["If under 70% correct, press 🗣 Discuss & revote during the 6 s results screen: “Convince your neighbor why.”"],
    next: "Quiz: the hp = 9999 cheat.",
  },
  "enc-q2": {
    say: ["“Someone tries the cheat. What does Python do?”"],
    answer: "B: AttributeError. `hp` is a property with no setter, so assigning to it raises an error.",
    concept: "Failing loudly is a feature. A silent failure (option C) would hide bugs; an error tells the cheater exactly what they can't do.",
    watch: ["“hp becomes 9999” is what happens WITHOUT @property. Good moment to contrast with the hook slide."],
    next: "Coding challenge: lock down the Knight.",
  },
  "enc-task": {
    say: [
      "“Your turn. The starter Knight is wide open. Make hp private and read-only, and make take_damage and heal follow the rules.”",
      "“Hit Run tests as often as you like. The checklist shows what passes, and you get points per check.”",
    ],
    doNow: [
      "Watch the per-test bars on this host page. Walk the room.",
      "If ‘read-only’ is red for many: “Add the @property, then delete the `self.hp = ...` line in __init__.”",
      "Hints unlock for students at 60 s and 120 s. Point stuck students to them.",
    ],
    watch: [
      "Most common bug: keeping `self.hp = max_hp` in __init__. That clashes with the property (AttributeError: property 'hp' … has no setter).",
      "Forgetting `self._max_hp`, so heal() has nothing to cap at.",
      "Writing `return self.hp` inside the property, which calls itself forever (RecursionError). It must be `self._hp`.",
    ],
    next: "Solution walkthrough: the locked-down Knight.",
  },
  "enc-solution": {
    doNow: [
      "Press → (or Next point ▶) to highlight each numbered point; the projector and laptops highlight the matching lines. Press → again after the last point to move on.",
      "Students can see this code on their laptops too.",
    ],
    say: [
      "Point 1: “The real values live in _hp and _max_hp. Underscore: hands off.”",
      "Point 2: “@property is the read-only window. Reading works; writing raises AttributeError.”",
      "Point 3: “take_damage is the front door, and it enforces two rules: no negative damage, never below zero.”",
      "Point 4: “heal caps at max with min(...). Same idea in the other direction.”",
    ],
    ask: ["“Who hit the AttributeError about ‘has no setter’? What line caused it?” (it was the leftover `self.hp = max_hp`)"],
    watch: ["If many students didn't finish, slow down on point 2: the property plus deleting `self.hp = ...` is the key move."],
    next: "Abstraction.",
  },

  // ---------------------------------------------------------------- abstraction
  "abs-intro": {
    say: ["“Abstraction: show WHAT something does and hide HOW. The arena doesn't care how your fighter thinks. It just needs a promise that it CAN decide a move.”"],
    concept: "Analogy: a steering wheel. Every car has one; you don't need to know how the steering rack works to drive any car.",
    next: "Code: the Fighter ABC.",
  },
  "abs-code": {
    say: [
      "“ABC is an Abstract Base Class: a blueprint you're not allowed to build directly.”",
      "“@abstractmethod is the contract: every subclass MUST write choose_move. Fighter itself provides the rest: strike, heal, guard.”",
      "“The arena only ever calls choose_move(). That's the whole interface.”",
    ],
    concept: "An abstract class mixes two things: required methods (abstract, no real body) and shared methods (concrete, inherited for free).",
    faq: [
      { q: "Why not just leave choose_move empty in Fighter?", a: "Then a fighter that forgot it would silently do nothing in battle. Abstract makes forgetting an error you see immediately." },
      { q: "Is this like an interface in Java?", a: "Close. A Python ABC can also include working methods, like a Java abstract class." },
    ],
    next: "Quiz: what does Fighter() do?",
  },
  "abs-q1": {
    say: ["“Fighter is abstract. What happens if we try to build one?”"],
    answer: "B: TypeError. Python refuses to build a class that still has an abstract method (the exact wording varies by Python version).",
    watch: ["“Creates a blank fighter” is how a regular class would behave. Contrast: abstract classes refuse to be built."],
    next: "Quiz: when does Python complain?",
  },
  "abs-q2": {
    say: ["“Think carefully: WHEN is the error raised?”"],
    answer: "B: when you create an object. Defining `class Rogue(Fighter): pass` is fine; `Rogue()` raises TypeError.",
    watch: [
      "This one usually splits the room. A strong candidate for 🗣 Discuss & revote.",
      "C (only when called in battle) is how it would work WITHOUT ABC, which is exactly the bug ABC prevents.",
    ],
    concept: "Failing at construction time means a broken fighter never even enters the arena.",
    next: "Coding challenge: Training Dummy.",
  },
  "abs-task": {
    say: ["“First run it as-is and watch Fighter() fail. Then make TrainingDummy a complete class by giving it choose_move.”"],
    doNow: ["Short task (2.5 min). The simplest answer is fine: `return self.guard()`."],
    watch: [
      "Students writing `def choose_move(self):` without the `enemy` parameter. The arena passes one, so it must be accepted.",
      "Returning a string like \"guard\" instead of calling `self.guard()`.",
    ],
    next: "Solution walkthrough: the Training Dummy.",
  },
  "abs-solution": {
    doNow: ["Short one: four points, about a minute. → steps through them."],
    say: [
      "Point 1: “Fighter is a contract. It has an abstract choose_move, so Fighter() is a TypeError.”",
      "Point 2: “Inheriting from Fighter signs the contract. You get everything except the decision.”",
      "Point 3: “Keep the promise: write choose_move, take the enemy parameter, and RETURN a move.”",
      "Point 4: “Nothing abstract left, so now it can be built.”",
    ],
    watch: ["Missing `return` is the quiet bug here: the method runs but hands back None, which the referee treats as a fumble."],
    next: "Halfway leaderboard.",
  },
  "lb-1": {
    say: ["“Halfway check-in! Top 5 on screen; your own rank is on your laptop.”", "“The tournament is worth a lot of points, so this can still flip.”"],
    doNow: ["Keep it quick: 20–30 seconds."],
    next: "Inheritance.",
  },

  // ---------------------------------------------------------------- inheritance
  "inh-intro": {
    say: ["“Inheritance: a child class gets everything the parent has, then adds or overrides. We wrote HP logic once in Fighter, and every fighter gets it for free.”"],
    concept: "Without inheritance, each of 50 fighter classes would copy-paste take_damage(), heal() and the rest, and a bug fix would need 50 edits.",
    next: "Code: class Mage(Fighter).",
  },
  "inh-code": {
    say: [
      "`class Mage(Fighter)`: “read it as: a Mage IS-A Fighter.”",
      "`super().__init__(...)`: “run the parent's setup first. That's what creates HP, stats and potions.”",
      "“choose_move is overridden; heal() and strike() are inherited. We never wrote them here.”",
    ],
    concept: "IS-A test: if 'X is a Y' sounds right, inheritance fits. A Mage is a Fighter ✓. A Sword is a Fighter ✗ (a fighter HAS a sword: composition).",
    faq: [{ q: "What does super() actually return?", a: "A proxy for the parent class, so super().__init__(...) runs Fighter's __init__ on this object." }],
    next: "Arena rules: the moves you inherit.",
  },
  "inh-rules": {
    say: [
      "Read each move out loud. Strike: reliable. Heavy strike: big but 40% to hit, good against high defense. Guard: halve damage AND charge your next attack. Heal: 3 potions.",
      "“Stat budget: hp divided by 10, plus power, defense and speed, must be 40 or less. Speed decides who goes first and your dodge chance.”",
      "“The referee keeps the real HP and re-checks your stats. Setting self._power = 99 gets caught: encapsulation again!”",
    ],
    concept: "Balance facts (from simulations): always heavy-striking loses; mixing moves by situation wins most often. Healing below ~30–35% HP is a strong simple rule.",
    faq: [
      { q: "What if I go over the budget?", a: "Your fighter fails to build. The tests and Practice battle will tell you the exact total." },
      { q: "Can I read the enemy's stats?", a: "Yes: choose_move(self, enemy) gets enemy.hp, enemy.defense, enemy.guarding, enemy.last_move and more (read-only)." },
    ],
    next: "Quiz: method lookup.",
  },
  "inh-q1": {
    say: ["“Ninja has no methods of its own. Where does Python look?”"],
    answer: "B: \"Too slow!\". Python checks Ninja, then Rogue (found it), then would check Fighter. The nearest definition wins.",
    concept: "This lookup chain is the Method Resolution Order (MRO). You can print it with Ninja.__mro__.",
    next: "Quiz: spot the bug.",
  },
  "inh-q2": {
    say: ["“Tank overrides __init__. What's missing?”"],
    answer: "B: AttributeError: no attribute '_hp'. Tank's __init__ replaces Character's and never calls `super().__init__(name)`, so `_hp` is never set.",
    doNow: ["Say it out loud, because it's the #1 bug in the next task: “If you override __init__, call super().__init__().”"],
    watch: ["“Prints 100” assumes the parent's __init__ runs automatically. In Python it doesn't once you override it."],
    next: "Coding challenge: build YOUR fighter.",
  },
  "inh-task": {
    say: [
      "“This is the fighter that enters the tournament. Pick stats within the budget and write a strategy that uses at least two different moves.”",
      "“Press ⚔️ Practice battle to fight the house bots. Can you beat all three?”",
    ],
    doNow: [
      "Watch the per-test bars. The usual failing checks are ‘calls super().__init__’ and ‘within budget’.",
      "Shout out anyone who beats all three house bots.",
    ],
    watch: [
      "Over budget: hp=150 alone costs 15 of the 40 points.",
      "`choose_move` returning nothing (forgot `return`): the referee counts it as a fumble.",
      "Using `self.hp = ...` to heal. HP is read-only; they must call `self.heal()`.",
    ],
    faq: [{ q: "What's a good strategy?", a: "Don't give it away. Hint: heal when low, heavy strike against high defense or a guarding enemy, guard to charge up a big hit." }],
    next: "Example walkthrough: one fighter that works.",
  },
  "inh-solution": {
    doNow: [
      "Say up front: “This is ONE example. Your fighter should have your own stats and strategy, so don't copy Ember!”",
      "→ steps through the five points.",
    ],
    say: [
      "Point 1: “Pyromancer IS-A Fighter, so it gets HP, potions and all the moves.”",
      "Point 2: “super().__init__ runs Fighter's setup with our stats. Check the budget out loud: 9 + 16 + 5 + 10 = 40.”",
      "Point 3: “Heal when low, but only if potions are left.”",
      "Point 4: “Read the enemy: heavy strike when they're guarding or tanky.”",
      "Point 5: “Otherwise strike. That's three moves, so the strategy check passes.”",
    ],
    ask: ["“Who found a strategy that beat all three house bots? What did you do differently?”"],
    concept: "Every `self.heal()`, `self.strike()` and `self.hp_percent` used here is inherited: Pyromancer defines none of them.",
    next: "Leaderboard.",
  },
  "lb-2": {
    say: ["“Quick look at the board before the last pillar.”"],
    doNow: ["Keep it under 30 seconds."],
    next: "Polymorphism.",
  },

  // ---------------------------------------------------------------- polymorphism
  "poly-intro": {
    say: ["“Polymorphism: many forms, one interface. The arena calls fighter.choose_move(), and each class answers in its own way.”"],
    concept: "The arena code was written before any of your classes existed, and it works with all of them without changes. That's the payoff of the other three pillars.",
    next: "Code: the arena loop.",
  },
  "poly-code": {
    say: [
      "“Look: no if type(f) == Mage anywhere. The arena just calls the method.”",
      "“Python picks which choose_move to run based on the object's class, at runtime.”",
    ],
    concept: "Polymorphism lets you add new types without editing the code that uses them (the Open/Closed principle).",
    faq: [{ q: "Is this just inheritance?", a: "Related but different. Inheritance shares code; polymorphism means the caller doesn't care which class it's talking to. Python also allows it without inheritance (duck typing, next question)." }],
    next: "Quiz: predict the loop's output.",
  },
  "poly-q1": {
    say: ["“Same call, three objects. What prints?”"],
    answer: "A: \"Burn! ... ...\". Mage overrides cry; Tank inherits Fighter's; Fighter uses its own.",
    watch: ["“Burn! Burn! Burn!” means they think Tank inherits from Mage. It inherits from Fighter."],
    next: "Quiz: duck typing.",
  },
  "poly-q2": {
    say: ["“Duck doesn't inherit from Fighter at all. Does the call work?”"],
    answer: "A: yes. Python only cares that choose_move exists (duck typing: if it walks like a duck…).",
    concept: "Twist: our referee checks that the RETURN value is a real move, so 'quack' would fumble the turn. The call works; the move is invalid.",
    next: "Final coding challenge: battle cry and submit.",
  },
  "poly-task": {
    say: [
      "“Your fighter from the inheritance task is already loaded. Override battle_cry() so it shouts something when it enters the arena.”",
      "“Then press 🏟 Submit to Arena. Your card pops onto the big screen. You can keep improving and press Update until I lock submissions.”",
    ],
    doNow: [
      "Watch the submission cards appear on the projector.",
      "Remind them: no submission means fighting as a Rookie, so submit even if it isn't perfect.",
      "Lock submissions from the host when time's up (starting the tournament also locks them).",
    ],
    watch: ["battle_cry must RETURN a string (1–80 characters), not print it."],
    next: "Solution walkthrough: one call, many fighters.",
  },
  "poly-solution": {
    doNow: ["→ steps through the three points, then on to the tournament rules."],
    say: [
      "Point 1: “battle_cry overrides Fighter's default. It returns the string; the arena does the printing.”",
      "Point 2: “Look at the arena loop: it never checks what class f is. It just calls f.battle_cry().”",
      "Point 3: “Same with choose_move. One line of arena code, a whole room's worth of different strategies. That's polymorphism, and you're about to watch it.”",
    ],
    concept: "The arena was written before any student class existed, and it needs zero changes to run them all.",
    next: "Tournament rules.",
  },

  // ---------------------------------------------------------------- tournament
  "tourney-rules": {
    say: [
      "“Everyone's in. If you didn't submit, you fight as a Rookie.”",
      "“Random bracket. 500 points per win, and the champion gets 1500 more.”",
      "“Watch the battle log: every line is the arena calling choose_move() on a class it has never seen. That's polymorphism, live.”",
    ],
    next: "Start the tournament.",
  },
  tournament: {
    doNow: [
      "Press ▶ Start tournament. The projector computes every battle in a second or two.",
      "Early rounds fast-forward as a grid; quarterfinals onward play in full. Students cheer from their laptops.",
      "Short on time? Use ⏭ Skip (battle or round) or ⏩ 2× speed.",
    ],
    say: ["Narrate the log: “Mage.choose_move() returned heal() — smart, it was at 20% HP!”", "Ask the finalists to explain their strategy."],
    faq: [
      { q: "Why did my fighter fumble?", a: "choose_move crashed, returned something that isn't a move, or ran too long. The log line shows which." },
      { q: "Is it random?", a: "Partly: hit chance, dodges and damage variation. Good strategy wins more often, not always." },
    ],
    next: "Exit tickets.",
  },
  "exit-1": {
    say: ["“Three quick ones, 15 seconds each, and they're scored, so the podium can still change.”"],
    answer: "A: Encapsulation (protecting data behind a property).",
    next: "Exit ticket 2.",
  },
  "exit-2": {
    answer: "C: Inheritance (Mage gets take_damage from Fighter without rewriting it).",
    next: "Exit ticket 3.",
  },
  "exit-3": {
    answer: "D: Polymorphism (one call, each class answers its own way).",
    doNow: ["If abstraction never came up as a wrong answer, ask: “Which pillar did choose_move being required come from?” (abstraction)."],
    next: "Final podium.",
  },
  podium: {
    say: [
      "Drumroll: 3rd, 2nd, then 1st. Then shout out the tournament champion separately: “Their CODE won.”",
      "Wrap-up: “Encapsulation protected the data, abstraction set the contract, inheritance shared the code, polymorphism let one arena run them all.”",
    ],
    doNow: ["Students see a personal recap card on their laptops (rank, points, checks passed, fight record)."],
    next: "Done! Press Reset on the host before the next section.",
  },
};
