import { memo, useMemo } from "react";
import type { SpriteId } from "../../../shared/types.ts";
import { GRIDS, paletteFor } from "../lib/sprites.ts";

interface Props {
  sprite: SpriteId;
  seed?: string; // tints the sprite's team color per player
  size?: number;
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

/** Crisp pixel-art fighter rendered as SVG rects (scales without blurring). */
export const Sprite = memo(function Sprite({ sprite, seed, size = 64, flip, className, style, title }: Props) {
  const rects = useMemo(() => {
    const grid = GRIDS[sprite] ?? GRIDS.knight;
    const palette = paletteFor(sprite, seed);
    const out: JSX.Element[] = [];
    grid.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === ".") {
          x++;
          continue;
        }
        let run = 1;
        while (x + run < row.length && row[x + run] === ch) run++;
        out.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={palette[ch] ?? "#ff00ff"} />);
        x += run;
      }
    });
    return out;
  }, [sprite, seed]);
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined, overflow: "visible", ...style }}
      role="img"
      aria-label={title ?? sprite}
    >
      {rects}
    </svg>
  );
});

/** Stable sprite for a player who hasn't built a fighter yet (lobby avatars). */
export function avatarSprite(name: string): SpriteId {
  const ids: SpriteId[] = ["knight", "mage", "rogue", "golem", "slime", "dragon", "skeleton", "archer"];
  let h = 0;
  for (const ch of name) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return ids[h % ids.length];
}
