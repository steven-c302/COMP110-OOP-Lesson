from arena import Fighter


class TrainingDummy(Fighter):
    SPRITE = "slime"

    def choose_move(self, enemy):
        return self.guard()
