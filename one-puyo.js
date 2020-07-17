const puzzleGenerator = require('./puzzle_generator.js')
const field = require('./field.js')
const timer = require('./timer.js')
const fs = require('fs')
const difficultyOpts = ['e', 'n', 'h']
const defaultDifficulty = difficultyOpts[1]
const difficultyNames = { e: 'Easy', n: 'Normal', h: 'Hard' }
const intervalMsec = { e: 600, n: 500, h: 400 }
const speedrunPuzzleCount = 5

const getRecordPath = (difficulty) => {
  return `./${difficulty}_record.txt`
}

const isRecordExisting = (difficulty) => {
  try {
    fs.statSync(getRecordPath(difficulty))
    return true
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false
    } else {
      console.log(error)
    }
  }
}

const getPreviousRecord = (difficulty) => {
  return fs.promises.readFile(getRecordPath(difficulty), 'utf-8')
}

const saveRecord = (record, difficulty) => {
  fs.createWriteStream(getRecordPath(difficulty)).write(record)
}

const solvePuzzle = async (fld, difficulty, puzzleTimer) => {
  fld.outputAll()
  fld.outputFooter()
  // PuzzleTimer が渡された場合は開始日時をセット
  if (puzzleTimer !== undefined) {
    puzzleTimer.startLap()
  }
  const input = await fld.promptToPutPuyo()
  // PuzzleTimer が渡された場合は回答日時をセット
  if (puzzleTimer !== undefined) {
    puzzleTimer.stopLap()
  }
  fld.put(input.type, input.column)
  fld.outputAll()
  // 連鎖発火の結果を受け取る
  const result = await fld.trigger(intervalMsec[difficulty])
  console.log(result)
  return fld.isPuyoRemaining()
}

// 問題を解けるまで繰り返す
const solvePuzzleUntilAllcleared = async (fld, difficulty, puzzleTimer) => {
  let puyoRemaining = true
  while (puyoRemaining) {
    const fldCopy = fld.copy()
    puyoRemaining = await solvePuzzle(fldCopy, difficulty, puzzleTimer)
    // ぷよが残っている場合は一時停止
    if (puyoRemaining) {
      await field.sleep(intervalMsec[difficulty])
    }
  }
}

const compareWithPreviousBest = async (difficulty, tm) => {
  const previousRecord = Number(await getPreviousRecord(difficulty))
  if (previousRecord <= tm.getSumTotalTime() / 1000) {
    console.log(`Your Best: ${previousRecord} secs`)
  } else {
    console.log('✨New Record✨')
    console.log(
      `Your Previous Best: ${previousRecord} secs (+ ${(
        previousRecord -
        tm.getSumTotalTime() / 1000
      ).toFixed(3)} secs)`
    )
    saveRecord(String(tm.getSumTotalTime() / 1000), difficulty)
  }
}

// タイムアタックモード
const startSpeedrun = async (difficulty) => {
  console.log(`💨Speedrun Mode (Solve ${speedrunPuzzleCount} puzzles!)💨`)
  console.log(
    `Note: ${
      timer.penaltyTime / 1000
    } secs will be added to your record for every wrong answers.`
  )
  const tm = new timer.Timer()
  const flds = [puzzleGenerator.getValidPuzzleField(difficulty)]
  for (let i = 0; i < speedrunPuzzleCount; i++) {
    // 問題を 1 問先読みする
    flds.push(puzzleGenerator.getValidPuzzleField(difficulty))
    const fld = await flds[i]
    tm.setNewPuzzleTimer()
    await solvePuzzleUntilAllcleared(
      fld,
      difficulty,
      tm.getCurrentPuzzleTimer()
    )
  }
  // 結果出力
  console.log(`Mode: ${difficultyNames[difficulty]}`)
  console.log(
    `Result: ${tm.getSumTotalTime() / 1000} secs (Solving Time: ${
      tm.getSumSolvingTime() / 1000
    } secs, Penalty Time: ${tm.getSumPenaltyTime() / 1000} secs)`
  )
  if (isRecordExisting(difficulty)) {
    compareWithPreviousBest(difficulty, tm)
  } else {
    console.log('✨New Record✨')
    saveRecord(String(tm.getSumTotalTime() / 1000), difficulty)
  }
}

// 通常モード(1 問出題)
const startSinglePuzzle = async (difficulty) => {
  const fld = await puzzleGenerator.getValidPuzzleField(difficulty)
  solvePuzzleUntilAllcleared(fld, difficulty)
}

const main = () => {
  const argv = require('minimist')(process.argv.slice(2))
  let difficulty = defaultDifficulty
  difficultyOpts.forEach((difficultyOpt) => {
    if (difficultyOpt in argv) {
      difficulty = difficultyOpt
    }
  })
  if ('t' in argv || 's' in argv) {
    startSpeedrun(difficulty)
  } else {
    startSinglePuzzle(difficulty)
  }
}

main()
