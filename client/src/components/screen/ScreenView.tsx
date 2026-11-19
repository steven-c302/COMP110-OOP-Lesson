// Renders whatever the projector should show for the current step.
import type { AdminView, TournamentResult } from "../../../../shared/types.ts";
import { Stage } from "../Stage.tsx";
import { PillarBar, ScreenLobby, ScreenSlide } from "./ScreenBasics.tsx";
import { ScreenQuiz } from "./ScreenQuiz.tsx";
import { ScreenCode, ScreenLeaderboard, ScreenPodium } from "./ScreenBoards.tsx";
import { ScreenTournament } from "./ScreenTournament.tsx";

interface Props {
  view: AdminView;
  now: number;
  emit: (event: string, payload?: unknown) => void;
  sound: boolean;
  preview?: boolean;
  result: TournamentResult | null;
  cmd: { name: string; n: number };
}

export function ScreenView({ view, now, emit, sound, preview, result, cmd }: Props) {
  const step = view.steps[view.stepIndex];
  const showBar = step.type !== "lobby" && step.type !== "tournament" && step.type !== "podium" && !(step.type === "slide" && step.layout === "title");
  const joinHint = step.type !== "lobby" && view.settings.lateJoin;
  return (
    <div data-theme={view.settings.theme} data-reduced-motion={view.settings.reducedMotion} style={{ width: "100%", height: "100%" }}>
      <Stage>
        {showBar && <PillarBar steps={view.steps} index={view.stepIndex} />}
        {step.type === "lobby" && <ScreenLobby view={view} sound={sound} />}
        {step.type === "slide" && <ScreenSlide key={step.id} step={step} focus={view.focus ?? 0} />}
        {step.type === "quiz" && view.quiz && <ScreenQuiz key={step.id} step={step} quiz={view.quiz} now={now} sound={sound} />}
        {step.type === "code" && <ScreenCode key={step.id} step={step} view={view} now={now} sound={sound} />}
        {step.type === "leaderboard" && <ScreenLeaderboard key={step.id} step={step} view={view} sound={sound} />}
        {step.type === "tournament" && <ScreenTournament view={view} result={result} emit={emit} sound={sound} cmd={cmd} preview={preview} />}
        {step.type === "podium" && <ScreenPodium view={view} sound={sound} revealCmd={cmd.name === "podium" ? cmd.n : 0} />}
        {joinHint && (
          <div className="mono" style={{ position: "absolute", left: 40, bottom: 18, fontSize: 22, color: "var(--muted)", opacity: 0.8 }}>
            join: {(view.joinUrl || window.location.origin).replace(/^https?:\/\//, "")}
          </div>
        )}
      </Stage>
    </div>
  );
}
