// Original 16x16 pixel-art fighters, drawn as character grids.
// Each letter maps to a color in that sprite's palette; "." is transparent.
import type { SpriteId } from "../../../shared/types.ts";

export const GRIDS: Record<SpriteId, string[]> = {
  knight: [
    "......rrr.......",
    ".....rrRr.......",
    "....kkkkkk......",
    "...kssssddk.....",
    "...kSsssssk.....",
    "...kskkkksk.....",
    "...kssssssk...w.",
    "....kddddk....w.",
    "...kbbbbbbk...w.",
    "..kbBbbbbbbk..w.",
    "..kbBbbbbbffkhhh",
    "..kbbbbbbbk...h.",
    "...kyyyyyyk.....",
    "...kbbkkbbk.....",
    "...kgk..kgk.....",
    "...kkk..kkk.....",
  ],
  mage: [
    ".......k........",
    "......kpk.......",
    ".....kpPpk......",
    ".....kpppk...kk.",
    "....kpppPpk.kOok",
    "...kkkkkkkkkkook",
    ".....kffffk..kk.",
    ".....kfefek...t.",
    ".....kffffk...t.",
    "....kpppppkfft..",
    "...kppPpppppkt..",
    "...kpPppppppkt..",
    "..kppppyyppppkt.",
    "..kpppppppppkt..",
    "..kpppppppppkt..",
    "...kkkkkkkkk.t..",
  ],
  rogue: [
    "................",
    ".....kkkkk......",
    "....kgggggk.....",
    "...kgGgggggk....",
    "...kgkkkkkgk....",
    "...kgkfefekk....",
    "...kgkmmmmk.....",
    "....kgkkkkgk....",
    "...kggggggggk...",
    "..kgGgggggggk.w.",
    "..kgGggyyggfkw..",
    "..kgggggggkfh...",
    "...kggggggk.....",
    "...kddkkddk.....",
    "...kdk..kdk.....",
    "...kkk..kkk.....",
  ],
  golem: [
    "................",
    "....kkkkkkkk....",
    "...kssssssssk...",
    "...ksSssssssk...",
    "...kseesseesk...",
    "...kssssssssk...",
    "..kkkkkkkkkkkk..",
    ".kssssmmmmsssssk",
    ".ksSsmmGGmmssssk",
    ".ksssmmGGmmsSssk",
    ".kssssmmmmsssssk",
    "..kkksssssskkk..",
    "....ksssssk.....",
    "...kssk.ksssk...",
    "...kssk..kssk...",
    "...kkkk..kkkk...",
  ],
  slime: [
    "................",
    "................",
    "................",
    "......kkkk......",
    "....kkggggkk....",
    "...kgGGgggggk...",
    "..kgGgggggggggk.",
    "..kgggggggggggk.",
    ".kggekggggekgggk",
    ".kggkkggggkkgggk",
    ".kggggggggggggk.",
    ".kgggggmmmgggggk",
    ".kggggggggggggk.",
    "..kgggggggggggk.",
    "...kkkkkkkkkkk..",
    "................",
  ],
  dragon: [
    "................",
    "..kk.......kk...",
    ".krrk.....krk...",
    ".krrrkkkkkrrk...",
    "..krrrrrrrrk....",
    "..krreerrrrrk...",
    "..krrrrrrrrrrkk.",
    "..krrrryyyyyyyk.",
    "...krrrkkkkkkk..",
    "..kwwkrrrrrk....",
    ".kwWwkrrRrrrk.k.",
    ".kwwwkrrRrrrkkrk",
    "..kwkrrrrrrrrrk.",
    "...krrkkrrkkkk..",
    "...kyk..kyk.....",
    "...kkk..kkk.....",
  ],
  skeleton: [
    "................",
    ".....kkkkkk.....",
    "....kbbbbbbk....",
    "...kbBbbbbbbk...",
    "...kbkkbbkkbk...",
    "...kbkebbekbk...",
    "...kbbbkkbbbk...",
    "....kbmmmmbk....",
    ".....kbbbbk.....",
    "...kkbkbbkbkk...",
    "..kbkbkbbkbkbk..",
    "..kbkkbbbbkkbk..",
    "....kbkbbkbk....",
    "....kbk..kbk....",
    "....kbk..kbk....",
    "....kkk..kkk....",
  ],
  archer: [
    "..........k.....",
    ".....kkkkkwk....",
    "....kgggggkwk...",
    "...kgGgggggkwk..",
    "...kgkffffk.kwk.",
    "...kgkfefek..kwk",
    "....kkffffk..kwk",
    "....kgggggk..kwk",
    "...kgggggggkkfwk",
    "..kgGggggggkf.kw",
    "..kgGgyyyggk..kw",
    "..kggggggggk.kw.",
    "...kggggggk.kw..",
    "...kddkkddk.k...",
    "...kdk..kdk.....",
    "...kkk..kkk.....",
  ],
};

const K = "#181425";

export const PALETTES: Record<SpriteId, Record<string, string>> = {
  knight: { k: K, r: "#e43b44", R: "#ff8a8a", s: "#c0cbdc", S: "#ffffff", d: "#8b9bb4", b: "#0099db", B: "#2ce8f5", f: "#c0cbdc", h: "#feae34", w: "#e8f1ff", y: "#feae34", g: "#5d3a28" },
  mage: { k: K, p: "#5b3bb5", P: "#8f6bff", f: "#e4a672", e: K, o: "#2ce8f5", O: "#ffffff", t: "#b86f50", y: "#feae34" },
  rogue: { k: K, g: "#265c42", G: "#3e8948", f: "#e4a672", e: K, m: "#262b44", y: "#b86f50", d: "#3a4466", w: "#e8f1ff", h: "#feae34" },
  golem: { k: K, s: "#8b9bb4", S: "#c0cbdc", e: "#2ce8f5", m: "#3e8948", G: "#63c74d" },
  slime: { k: K, g: "#63c74d", G: "#b6f2a0", e: "#ffffff", m: "#265c42" },
  dragon: { k: K, r: "#e43b44", R: "#f77622", e: "#feae34", y: "#feae34", w: "#a22633", W: "#e43b44" },
  skeleton: { k: K, b: "#ead4aa", B: "#ffffff", e: "#e43b44", m: "#c0cbdc" },
  archer: { k: K, g: "#3e8948", G: "#63c74d", f: "#e4a672", e: K, w: "#b86f50", y: "#feae34", d: "#5d3a28" },
};

/** Which palette keys are the "team color" that gets swapped per player. */
const TINT_KEYS: Partial<Record<SpriteId, [string, string]>> = {
  knight: ["b", "B"],
  mage: ["p", "P"],
  rogue: ["g", "G"],
  slime: ["g", "G"],
  dragon: ["r", "R"],
  archer: ["g", "G"],
};

const VARIANTS: [string, string][] = [
  ["#0099db", "#2ce8f5"],
  ["#e43b44", "#ff8a8a"],
  ["#3e8948", "#63c74d"],
  ["#c28b00", "#fee761"],
  ["#b55088", "#f6757a"],
  ["#5b3bb5", "#8f6bff"],
  ["#d65a1a", "#feae34"],
  ["#3a4466", "#8b9bb4"],
];

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function paletteFor(sprite: SpriteId, seed?: string): Record<string, string> {
  const base = PALETTES[sprite] ?? PALETTES.knight;
  const keys = TINT_KEYS[sprite];
  if (!seed || !keys) return base;
  const [dark, light] = VARIANTS[hashString(seed) % VARIANTS.length];
  return { ...base, [keys[0]]: dark, [keys[1]]: light };
}

export const SPRITE_IDS = Object.keys(GRIDS) as SpriteId[];
