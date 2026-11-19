from arena import Fighter

# Fighter is an ABSTRACT class. Uncomment the next line and press Run.
# f = Fighter()


class TrainingDummy(Fighter):
    SPRITE = "slime"

    # TODO: implement the abstract method choose_move(self, enemy).
    # It must return a move, like self.guard() or self.strike().
    pass


dummy = TrainingDummy()
print(dummy.describe())
