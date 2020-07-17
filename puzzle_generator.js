const puyo = require('./puyo.js')
const field = require('./field.js')
const minChainCount = { e: 3, n: 4, h: 5 }

const shuffle = (array) => {
  for (let i = array.length; i > 1; i--) {
    const k = Math.floor(Math.random() * i)
    const tmp = array[k]
    array[k] = array[i - 1]
    array[i - 1] = tmp
  }
  return array
}

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// ぷよを置くべき列を取得
// ぷよの種類ごとに設定されている minColumn の 1 つ左の列から、maxColumn の 1 つ右の列までの間で、ランダムな列を取得
const getColumnToPut = (minColumn, maxColumn) => {
  if (minColumn > 0) {
    minColumn--
  }
  if (maxColumn < field.width - 1) {
    maxColumn++
  }
  return getRandomInt(minColumn, maxColumn)
}

// 有効な問題ができるまで生成を繰り返し、問題を取得
const getValidPuzzleField = async (difficulty) => {
  let puzzle
  let i = 0
  do {
    puzzle = new Puzzle(difficulty)
    if (i % 100 === 0) {
      await field.sleep(0)
    }
    i++
  } while (puzzle.getChainCountWhenAllCleared() < minChainCount[difficulty])
  puzzle.fld.setHighestRow()
  return puzzle.fld
}

class Puzzle {
  constructor (difficulty) {
    this.difficulty = difficulty
    this.fld = new field.Field()
    // 列ごとの高さメモ
    this.heightMemo = new Array(field.width).fill(0)
    // ぷよの種類ごとの、どの列に置くべきかメモ
    this.typeColumnMemos = new Array(puyo.puyoTypes.length - 1)
    for (let i = 0; i < this.typeColumnMemos.length; i++) {
      const randomInt = getRandomInt(0, field.width - 1)
      // minColumn, maxColumn に同一の初期値をセットする
      this.typeColumnMemos[i] = {
        type: i + 1,
        minColumn: randomInt,
        maxColumn: randomInt
      }
    }
    // ぷよを置く順番をシャッフルする
    this.shuffledMemos = shuffle(this.typeColumnMemos)
    if (this.difficulty === 'e') {
      this.tryToGenerateEasyPuzzle()
    } else if (this.difficulty === 'h') {
      this.tryToGenerateHardPuzzle()
    } else {
      this.tryToGenerateNormalPuzzle()
    }
  }

  tryToGenerateEasyPuzzle () {
    // 3 種類のぷよを 3 個ずつ置く
    this.putPuyosRandomly(this.shuffledMemos.slice(1), 3)
    // 2 種類のぷよを 1 個ずつ置く
    this.putPuyosRandomly(this.shuffledMemos.slice(2), 1)
    this.fld.triggerWithoutOutput()
  }

  tryToGenerateNormalPuzzle () {
    // 4 種類のぷよを 3 個ずつ置く
    this.putPuyosRandomly(this.shuffledMemos, 3)
    // 3 種類のぷよを 1 個ずつ置く
    this.putPuyosRandomly(this.shuffledMemos.slice(1), 1)
    this.fld.triggerWithoutOutput()
    let i = 0
    const loopCount = 3
    // フィールド生成時に連鎖が発生していない且つ、問題がまだ完成していない場合は、 loopCount 回、ぷよをランダムに 1 個置いていく
    while (
      this.fld.lastChainCount === 0 &&
      !this.isReasonablePuzzle(minChainCount[this.difficulty]) &&
      i < loopCount
    ) {
      this.putSinglePuyoRandomly()
      this.fld.triggerWithoutOutput()
      i++
    }
  }

  tryToGenerateHardPuzzle () {
    const firstSettingPuyoCount = getRandomInt(2, 3)
    const secondSettingPuyoCount =
      field.clearRequirement - firstSettingPuyoCount
    // 4 種類のぷよを 2 か 3 個ずつ置く
    this.putPuyosRandomly(this.shuffledMemos, firstSettingPuyoCount)
    // 4 種類のぷよを 2 か 1 個ずつ置く
    this.putPuyosRandomly(this.shuffledMemos, secondSettingPuyoCount)
    // 1 種類のぷよを 3 個置く
    this.putPuyosRandomly([this.shuffledMemos[0]], 3)
    this.fld.triggerWithoutOutput()
    let i = 0
    const loopCount = 4
    // フィールド生成時に連鎖が発生していない且つ、問題がまだ完成していない場合は、 loopCount 回、ぷよをランダムに 1 個置いていく
    while (
      this.fld.lastChainCount === 0 &&
      !this.isReasonablePuzzle(minChainCount[this.difficulty]) &&
      i < loopCount
    ) {
      this.putSinglePuyoRandomly()
      this.fld.triggerWithoutOutput()
      i++
    }
  }

  // ランダムな種類のぷよをランダムな場所に 1 個置く
  putSinglePuyoRandomly () {
    const memo = this.shuffledMemos[getRandomInt(0, puyo.puyoTypes.length - 2)]
    this.putPuyosRandomly([memo], 1)
  }

  // 指定種類のぷよを、指定個数置く
  putPuyosRandomly (typeColumnMemos, count) {
    typeColumnMemos.forEach((memo) => {
      for (let i = 0; i < count; i++) {
        // 置くべき列をランダムに取得
        const columnToPut = getColumnToPut(memo.minColumn, memo.maxColumn)
        // 置くべき行を高さメモから取得
        let rowToPut = field.height - this.heightMemo[columnToPut] - 1
        if (rowToPut < 0) {
          rowToPut = 0
        }
        this.fld.changeType(rowToPut, columnToPut, memo.type)
        // 高さメモを更新
        this.heightMemo[columnToPut]++
        // どの列に置くべきかメモを更新
        if (memo.minColumn > columnToPut) {
          memo.minColumn = columnToPut
        } else if (memo.maxColumn < columnToPut) {
          memo.maxColumn = columnToPut
        }
      }
    })
  }

  // 有効な問題かどうか確認
  isReasonablePuzzle (minChainCount) {
    return this.getChainCountWhenAllCleared() >= minChainCount
  }

  // 全消し時の連鎖数を取得
  getChainCountWhenAllCleared () {
    let chainCount = 0
    // 各ぷよを各列に置いて全消しできるかどうか全通り試す
    for (let type = 1; type < puyo.puyoTypes.length; type++) {
      for (let column = 0; column < field.width; column++) {
        // フィールドのコピーを生成し、全消しできるかどうか確認する
        const fldCopy = this.fld.copy()
        fldCopy.put(column, type)
        fldCopy.triggerWithoutOutput()
        if (fldCopy.isAllCleared()) {
          chainCount = fldCopy.lastChainCount
        }
      }
    }
    return chainCount
  }
}

module.exports = {
  getValidPuzzleField: getValidPuzzleField
}
