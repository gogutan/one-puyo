const penaltyTime = 5000

// 1 問ごとに 1 つの PuzzleTimer を持つ
class PuzzleTimer {
  constructor () {
    // 回答ごとに { from: 開始日時, to: 回答日時 } のオブジェクトを入れる
    // 2回回答した場合 → [{ from: 1回目の開始日時, to: 1回目の回答日時 }, { from: 2回目の開始日時, to: 2回目の回答日時 }]
    this.laps = []
  }

  // 回答開始時に実行する
  startLap () {
    this.laps.push({
      from: new Date()
    })
  }

  // 回答終了時に実行する
  stopLap () {
    this.getLastLap().to = new Date()
  }

  getLastLap () {
    return this.laps[this.laps.length - 1]
  }

  // 誤答数を取得する
  getWrongAnswerCount () {
    return this.laps.length - 1
  }

  // 回答時間を取得する
  getSolvingTime () {
    return this.laps.reduce((accumulator, currentValue) => {
      return accumulator + (currentValue.to - currentValue.from)
    }, 0)
  }

  // ペナルティ時間を取得する
  getPenaltyTime () {
    return penaltyTime * this.getWrongAnswerCount()
  }

  // 回答時間 + ペナルティ時間を取得する
  getTotalTime () {
    return this.getSolvingTime() + this.getPenaltyTime()
  }
}

// PuzzleTimer をまとめて持つ
class Timer {
  constructor () {
    this.puzzleTimers = []
  }

  setNewPuzzleTimer () {
    this.puzzleTimers.push(new PuzzleTimer())
  }

  getCurrentPuzzleTimer () {
    return this.puzzleTimers[this.puzzleTimers.length - 1]
  }

  getSumWrongAnswerCount () {
    return this.puzzleTimers.reduce((accumulator, currentValue) => {
      return accumulator + currentValue.getWrongAnswerCount()
    }, 0)
  }

  getSumSolvingTime () {
    return this.puzzleTimers.reduce((accumulator, currentValue) => {
      return accumulator + currentValue.getSolvingTime()
    }, 0)
  }

  getSumPenaltyTime () {
    return this.puzzleTimers.reduce((accumulator, currentValue) => {
      return accumulator + currentValue.getPenaltyTime()
    }, 0)
  }

  getSumTotalTime () {
    return this.getSumSolvingTime() + this.getSumPenaltyTime()
  }
}

module.exports = {
  PuzzleTimer: PuzzleTimer,
  Timer: Timer,
  penaltyTime: penaltyTime
}
