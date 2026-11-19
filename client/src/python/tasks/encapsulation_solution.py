class Knight:
    def __init__(self, name, max_hp):
        self.name = name
        self._max_hp = max_hp
        self._hp = max_hp

    @property
    def hp(self):
        return self._hp

    def take_damage(self, amount):
        if amount > 0:
            self._hp = max(0, self._hp - amount)

    def heal(self, amount):
        if amount > 0:
            self._hp = min(self._max_hp, self._hp + amount)
