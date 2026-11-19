class Knight:
    def __init__(self, name, max_hp):
        self.name = name
        # TODO 1: store max_hp and hp in PRIVATE attributes (names start with _)
        self.hp = max_hp  # 😱 anyone can write knight.hp = 9999

    # TODO 2: add a read-only @property called hp that returns the private value

    def take_damage(self, amount):
        # TODO 3: lower hp, but never below 0, and ignore negative amounts
        self.hp -= amount

    def heal(self, amount):
        # TODO 4: raise hp, but never above max_hp
        self.hp += amount


# Try it out! Press Run (or Ctrl+Enter)
knight = Knight("Sir Byte", 100)
knight.take_damage(30)
print(knight.hp)
