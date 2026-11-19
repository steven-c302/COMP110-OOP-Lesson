from arena import Fighter


class Pyromancer(Fighter):
    SPRITE = "mage"

    def __init__(self):
        super().__init__(name="Ember", hp=90, power=16, defense=5, speed=10)

    def choose_move(self, enemy):
        if self.hp_percent < 35 and self.potions > 0:
            return self.heal()
        if enemy.guarding or enemy.defense >= 8:
            return self.heavy_strike()
        return self.strike()
