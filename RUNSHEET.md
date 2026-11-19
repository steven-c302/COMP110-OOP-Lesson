# TA Run-sheet: OOP Arena (≈50 min)

The host page shows the same list with start times; click any row to jump there. **← / →** move between steps.

**Every question runs itself:** voting closes when everyone has answered (or time runs out), the screen shows how the room voted, and the answer reveals 6 s later. Press **⏸ Hold** on the host during those 6 s if you want to talk through the split first.

## Before class (15 min)

- [ ] Open the deployed URL ~10 min early (the free tier sleeps).
- [ ] `/host` → enter your PIN → **📽 Open projector window** → move it to the projector → **Start projector**.
- [ ] Sound check: lobby music should play. Use the host's 🔊 button to mute if the room needs it.
- [ ] Bright room? Toggle **🌙 Dark → ☀️ Light** on the host.
- [ ] Print the speaker notes: host page → **🖨 All notes** → Print. (The current step's notes also show on the host page during class.)
- [ ] Optional rehearsal the night before: `npm run bots -- 30` against the deployed URL.

## The session

| Start | Step | What to do / say |
|---|---|---|
| 0′ | **Lobby** | "Open the link or scan the QR code. Pick a name; the dice gives you a random one." Python preloads while they wait. Start when most names are in; late joiners are fine. |
| 2′ | **Title** | "Last time you built classes. Today, YOUR class fights in a tournament on this screen." |
| 2.5′ | **Hook: one line to beat the boss** | "Ever used a cheat code? Our arena runs 50 people's code. Why should we trust any of it?" |
| 3.5′ | **Warm-up poll** (no points) | No right answer. Options 1–2 (hide it / referee) are exactly what we'll build. |
| 4′ | **The Four Pillars** | Point at each card: "Each one solves a problem for the arena." The bar at the top tracks progress. |
| 5′ | **Encapsulation** intro + code | `_hp` is a promise; `@property` with no setter is what actually blocks `k.hp = 9999`; `take_damage()` is the front door. |
| 7.5′ | **Q: predict the output** | When the split appears and the host shows **<70% correct**, press **🗣 Discuss & revote** before the answer reveals. Students argue with a neighbor for 60 s, then vote again. The reveal marks the first vote with a tick on each bar. |
| 8.5′ | **Q: k.hp = 9999** | Quick one. It reveals on its own; move on. |
| 9′ | **💻 Lock down the Knight** (4 min) | Watch the per-test bars on the host. If "read-only" is red for many students, say: "Add `@property`, then delete `self.hp = ...` in `__init__`." Hints unlock for students at 60 s and 120 s. |
| 13′ | **Abstraction** intro + code | "A contract, not a fighter. The arena only needs `choose_move()`." Steering-wheel analogy. |
| 15.5′ | **2 questions** | The second ("when does Python complain?") often splits the room, so it's a good revote candidate. |
| 17′ | **💻 Training Dummy** (2.5 min) | Students try `Fighter()` and watch it fail, then implement `choose_move`. |
| 19.5′ | **🏆 Halfway check-in** | Projector shows the top 5; laptops show each student's own rank and neighbors. "The tournament can flip all of this." |
| 20′ | **Inheritance** intro, code, rules | Read the moves slide out loud. Mention: "The referee keeps the real HP and re-checks your stats. Setting `self._power = 99` gets caught." |
| 24′ | **2 questions** | "Spot the bug" (missing `super().__init__`) is the #1 bug in the next task, so say it out loud. |
| 25.5′ | **💻 Build YOUR fighter** (5 min) | Push the **⚔️ Practice battle** button: "Beat the house bots!" Stat budget: `hp//10 + power + defense + speed ≤ 40`. |
| 30.5′ | **🏆 Leaderboard** | Quick. |
| 31′ | **Polymorphism** intro + code | "Same call, different behavior. The arena was written before your class existed." |
| 33.5′ | **2 questions** | The duck-typing explanation has a twist: the referee checks the return value, so `"quack"` fumbles. |
| 35′ | **💻 Battle cry & submit** (3 min) | Students override `battle_cry()` and press **🏟 Submit to Arena**. Cards pop onto the projector. Lock submissions from the host when time's up (Start also locks automatically). |
| 38′ | **Tournament rules** | "No submission? You fight as a Rookie. Everyone's in." |
| 38.5′ | **⚔️ Tournament** (≈7 min) | Press **▶ Start tournament**. Qualifier rounds fast-forward; quarterfinals onward are full battles. Students cheer from their laptops. Use **⏭ Skip** or **⏩ 2×** if you're short on time. Point at the battle log: "That's polymorphism: the arena just calls `choose_move()`." |
| 45.5′ | **Exit ticket ×3** | "Name the pillar." 15 s each. Scored, so the top spots can still change. |
| 47′ | **🥇 Podium** | 3rd → 2nd → 1st reveal with a drumroll; the tournament champion appears separately. Students see a personal recap card. |

## If something goes wrong

- **Projector reloaded mid-tournament:** reopen `/screen`; it resumes from the last revealed match.
- **A student's laptop died:** they reopen the link on any device. If it's the same browser, their token keeps their score; otherwise they rejoin with a new name.
- **Inappropriate nickname:** host player list → ✎ rename or ✕ kick.
- **Python won't load for a student** (blocked CDN or very slow Wi-Fi): pair them with a neighbor. They still get quiz points and fight as a Rookie.
- **Ran long:** skip a question from the run-sheet (clicking ahead still scores answered questions), or Skip battles.
