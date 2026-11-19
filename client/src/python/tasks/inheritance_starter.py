from arena import Fighter


class MyFighter(Fighter):
    # Pick a sprite: knight mage rogue golem slime dragon skeleton archer
    SPRITE = "knight"

    def __init__(self):
        # TODO 1: call the PARENT constructor with your fighter's name and stats:
        #   super().__init__(name="...", hp=..., power=..., defense=..., speed=...)
        # Budget: hp//10 + power + defense + speed <= 40
        # Limits: hp 50-200 | power 1-25 | defense 0-15 | speed 1-20
        pass

    def choose_move(self, enemy):
        # You inherited: self.strike()  self.heavy_strike()  self.guard()  self.heal()
        # Read: self.hp_percent, self.potions, enemy.hp_percent, enemy.guarding,
        #       enemy.last_move, enemy.defense ...
        # TODO 2: use at least two different moves depending on the situation
        return self.strike()


me = MyFighter()
print(me.describe())
