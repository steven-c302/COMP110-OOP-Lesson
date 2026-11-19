// Default "Rookie" fighters for students who didn't submit, so everyone is in the bracket.

const ARCHETYPES = [
  { sprite: "knight", cls: "RookieKnight", stats: "hp=110, power=12, defense=8, speed=9", cry: "For the arena!" },
  { sprite: "archer", cls: "RookieArcher", stats: "hp=90, power=14, defense=4, speed=13", cry: "Never miss twice." },
  { sprite: "skeleton", cls: "RookieSkeleton", stats: "hp=100, power=13, defense=7, speed=10", cry: "Rattle rattle." },
  { sprite: "slime", cls: "RookieSlime", stats: "hp=140, power=10, defense=9, speed=7", cry: "Bloop." },
];

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function defaultFighterCode(playerName: string, playerId: string): string {
  const a = ARCHETYPES[hash(playerId) % ARCHETYPES.length];
  const name = JSON.stringify(`Rookie ${playerName}`.slice(0, 24));
  return `from arena import Fighter


class ${a.cls}(Fighter):
    SPRITE = "${a.sprite}"

    def __init__(self):
        super().__init__(name=${name}, ${a.stats})

    def choose_move(self, enemy):
        if self.hp_percent < 30 and self.potions > 0:
            return self.heal()
        return self.strike()

    def battle_cry(self):
        return ${JSON.stringify(a.cry)}
`;
}
