// Generated nicknames (adjective + fantasy creature): fun and abuse-resistant.
const ADJECTIVES = [
  "Brave", "Swift", "Clever", "Mighty", "Sneaky", "Cosmic", "Glitchy", "Lucky", "Fearless", "Shiny",
  "Silent", "Turbo", "Fuzzy", "Electric", "Frosty", "Blazing", "Mystic", "Rusty", "Nimble", "Jolly",
  "Stormy", "Pixel", "Quantum", "Wobbly", "Golden", "Shadow", "Bouncy", "Iron", "Crimson", "Sleepy",
];
const CREATURES = [
  "Wyvern", "Griffin", "Golem", "Kraken", "Phoenix", "Goblin", "Slime", "Basilisk", "Yeti", "Sprite",
  "Hydra", "Minotaur", "Pegasus", "Troll", "Wizard", "Knight", "Ranger", "Banshee", "Imp", "Dragon",
  "Owlbear", "Mimic", "Lich", "Djinn", "Centaur", "Gargoyle", "Kobold", "Unicorn", "Wraith", "Ogre",
];

export function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const c = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  return `${a} ${c}`;
}
