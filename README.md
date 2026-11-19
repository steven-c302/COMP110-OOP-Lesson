# ⚔️ OOP Arena

A live, game-show style lesson on the **four pillars of OOP** (encapsulation, abstraction, inheritance, polymorphism) in Python. One web app runs the whole session:

- **Projector (`/screen`)**: slides, timed quizzes with answer reveals, leaderboards, code-challenge progress, and a final **tournament** where every student's Python class battles with animated pixel-art fighters.
- **Students (`/`)**: join with a nickname, answer on their laptop, and write real Python in the browser. Code runs in-browser via [Pyodide](https://pyodide.org), with hidden tests and plain-English error hints. Then they submit a fighter.
- **Host (`/host`)**: the TA's control panel. Run-sheet with timings, live projector preview, private answer distribution, "Discuss & revote" (peer instruction), per-test pass rates, player list (rename/kick), and tournament controls.

Every pillar solves a real problem in the game:

| Pillar | Problem it solves in the arena |
|---|---|
| Encapsulation | Stops `boss.hp = 0` cheating: private `_hp` with a read-only `@property`, and a referee that keeps the real HP |
| Abstraction | The arena only needs one promise: every fighter has `choose_move()` (`Fighter` is an ABC) |
| Inheritance | Students write `class MyFighter(Fighter)` and call `super().__init__(...)`; HP, moves, and potions are inherited |
| Polymorphism | The arena calls `fighter.choose_move(enemy)` on classes it has never seen, which is the whole tournament |

## Quick start (local)

```bash
npm install
```

```bash
npm run dev
```

Then open:

- Students: http://localhost:5471
- Projector: http://localhost:5471/screen (click **Start projector** for fullscreen and sound)
- Host: http://localhost:5471/host

The host PIN is `HOST_PIN` (defaults to `1234` locally; **set your own before class**).

### Rehearse with fake students

```bash
npm run bots -- 30
```

This adds 30 bots that join, answer, "run tests", submit varied fighters (including one that sometimes hangs and one that crashes), and cheer. Point it at a deployed app with `npm run bots -- 30 https://your-app.onrender.com`.

## Deploy for class (Render free tier)

1. Push this folder to a GitHub repo.
2. On [Render](https://render.com): **New → Blueprint**, pick the repo (it reads `render.yaml`), and set **HOST_PIN** when prompted.
3. Share the URL with students. The lobby shows the URL and a QR code.

Notes:

- The free tier **sleeps after ~15 min idle**. Open the site ~10 minutes before class so it's warm.
- State lives in memory, with a snapshot every 3 s. One deployment = one live session; use **Reset** on the host to start over.
- Optional: set `PUBLIC_URL` if the join link shown on the projector should differ from the host's address.

## On class day

1. On the classroom computer, open `/host` and click **📽 Open projector window**. Drag that window to the projector, then click **Start projector**.
2. Students open the URL. Python (~6 MB) preloads while they're in the lobby.
3. Drive with **← / →** or the Next button. See [RUNSHEET.md](RUNSHEET.md) for a minute-by-minute script.
4. During battles: **Space** skips and **F** toggles 2× (on the projector), or use the host's buttons.

## Editing the lesson

- **Slides, questions, timings, speaker notes:** `server/lesson.ts`. Quiz answers stay on the server and are never sent to students before the reveal.
- **Coding tasks:** `client/src/python/tasks/*_starter.py` (starter code) and `*_tests.py` (hidden tests; each test's docstring is the checklist text students see).
- **Game rules and balance:** `client/src/python/arena.py` (stat budget 40; moves: strike, heavy strike at 40% to hit, guard with a +50% charge, and 3 heal potions).

## Tests

```bash
npm test
```

Runs the server session tests (vitest) plus the Python engine, harness, and reference-solution tests (unittest).

## How it works

- **Server:** Node + Express + Socket.IO (`server/`). The session state machine (`server/session.ts`) handles reading lock → answers → vote split shown to the room → automatic answer reveal 6 s later (or discuss → revote), scoring (accuracy first: speed bonus capped at 20%, streak bonus, revotes never scored), code results, submissions, and tournament points. Reconnecting students keep their score through a token in localStorage.
- **Python:** runs in a Web Worker in each browser (`client/src/python/worker.ts`). Student code never runs on the server. Infinite loops are caught by a step limit (and a worker timeout as backup). A fighter that keeps timing out gets benched.
- **Tournament:** computed on the projector machine in Pyodide, as a deterministic, seeded battle log, then replayed with animation. Early rounds fast-forward as a grid; the last three rounds play out fully. Anyone who didn't submit fights as a default "Rookie", so nobody sits out.
- **Anti-cheat referee:** the arena keeps its own copy of HP, potions, and stats, re-checks the stat budget, and only passes `choose_move` a read-only `EnemyInfo`. That makes a nice encapsulation talking point.

## Credits

- Fonts: Pixelify Sans, Atkinson Hyperlegible, JetBrains Mono (SIL Open Font License, via Google Fonts).
- Pixel-art fighters, music, and sound effects are original to this project. Sprites are hand-drawn 16×16 grids in `client/src/lib/sprites.ts`, and the audio is synthesized live with Web Audio in `client/src/lib/sound.ts`, so there are no asset licenses to track.
- Design choices (reading lock, relative leaderboards on student devices, top 5 only on the projector, lettered answer cards that don't rely on color, projector font minimums) follow published peer-instruction and classroom-game research.
