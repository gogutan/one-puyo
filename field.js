const readline = require('readline')
const puyo = require('./puyo.js')
// ぷよが消えるのに必要な連結個数
const clearRequirement = 4
const defaultIntervalMsec = 500
const height = 10
const width = 6
const footer = process.platform === 'darwin' ? '1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ ' : '１２３４５６'

const sleep = (msec) => {
  return new Promise(resolve => setTimeout(resolve, msec))
}

class Field {
  static isValidColumn (column) {
    return Number.isInteger(column) && column >= 1 && column <= width
  }

  constructor () {
    this.height = height
    this.width = width
    this.lastChainCount = 0
    // ぷよぷよが置かれている行のうち、最も高い行
    this.highestRow = height
    this.grid = new Array(height)
    for (let row = 0; row < height; row++) {
      this.grid[row] = new Array(width)
      for (let column = 0; column < width; column++) {
        this.grid[row][column] = new puyo.Puyo(0)
      }
    }
  }

  outputFooter () {
    console.log(footer)
  }

  outputAll () {
    // 空行を出力
    const emptyLineCount = 2
    for (let i = 0; i < emptyLineCount; i++) {
      console.log()
    }
    // ぷよの存在する行のみ上から順に出力
    for (let i = this.highestRow; i < this.height; i++) {
      this.outputSingleRow(i)
    }
  }

  outputSingleRow (row) {
    this.grid[row].forEach(py => {
      py.output()
    })
    console.log()
  }

  // 置くぷよの種類と列の入力を促す
  async promptToPutPuyo () {
    console.log(`Put one puyo(${puyo.puyoTypes.slice(1).join('')}) anywhere and connect four same puyos!`)
    const column = await this.questionWhereToPut()
    const type = await this.questionWhichTypeToPut()
    return {
      type: type,
      column: column - 1
    }
  }

  async questionWhereToPut () {
    let column = await this.question(`Which column? (Type a number between 1 and ${width}) `)
    while (!Field.isValidColumn(column)) {
      column = await this.question(`Invalid number input! Type a number between 1 and ${width} `)
    }
    return column
  }

  async questionWhichTypeToPut () {
    const typeQuestion = 'Which puyo? ' +
      puyo.puyoTypes.slice(1).map((py, index) => `${index + 1}:${py}`).join(',  ') +
      ` (Type a number between 1 and ${puyo.puyoTypes.length - 1}) `
    let type = await this.question(typeQuestion)
    while (!puyo.Puyo.isValidPuyoType(type)) {
      type = await this.question(`Invalid number input! Type a number between 1 and ${puyo.puyoTypes.length - 1} `)
    }
    return type
  }

  question (question) {
    const readlineInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    return new Promise((resolve) => {
      readlineInterface.question(question, number => {
        resolve(Number(number))
        readlineInterface.close()
      })
    })
  }

  // 指定のぷよを指定の列に置く
  put (type, column) {
    const py = new puyo.Puyo(type)
    if (this.isSpace(0, column)) {
      this.grid[0][column] = py
      this.drop(0, column)
    }
    this.setHighestRow()
  }

  // 連鎖を開始する
  async trigger (intervalMsec = defaultIntervalMsec) {
    this.lastChainCount = 0
    // ぷよを消去できた場合は、画面出力とぷよ落下を繰り返す
    while (this.clearAllConnectedCells()) {
      this.lastChainCount++
      await sleep(intervalMsec)
      this.outputAll()
      if (this.isAllCleared()) {
        break
      }
      await sleep(intervalMsec)
      this.dropAll()
      this.outputAll()
    }
    this.setHighestRow()
    if (this.isAllCleared()) {
      return '🎉Congratulations! You cleared all puyos!!👏'
    } else {
      return 'Hmm, there seems to remain some puyos in the field. Let\'s try again!'
    }
  }

  // 画面出力なしで連鎖を開始する
  triggerWithoutOutput () {
    this.lastChainCount = 0
    while (this.clearAllConnectedCells()) {
      this.lastChainCount++
      this.dropAll()
    }
    this.setHighestRow()
  }

  // フィールド全体を確認し、連結ぷよ数が clearRequirement 以上のぷよを消去する
  clearAllConnectedCells () {
    let cleared = false
    this.uncheckAll()
    for (let row = 0; row < this.height; row++) {
      for (let column = 0; column < this.width; column++) {
        // 消去確認不要のセルは確認しない
        if (!this.needToCheck(row, column)) {
          continue
        }
        this.check(row, column)
        const allConnectedCells = this.getAllConnectedCells(row, column)
        if (allConnectedCells.length >= clearRequirement) {
          this.clearCells(allConnectedCells)
          cleared = true
        }
      }
    }
    // いずれかのぷよを消去した場合 true を返す
    return cleared
  }

  // 同じ種類のぷよで連結している全てのセルを返す
  getAllConnectedCells (row, column) {
    const queue = [
      [row, column]
    ]
    const allConnectedCells = [
      [row, column]
    ]
    // BFS で連結しているセルを探索する
    while (queue.length > 0) {
      const [currentRow, currentColumn] = queue.shift()
      const neighboringConnectedCells = this.getNeighboringConnectedCells(currentRow, currentColumn)
      queue.push(...neighboringConnectedCells)
      allConnectedCells.push(...neighboringConnectedCells)
    }
    return allConnectedCells
  }

  // 上下左右の隣接するセルのうち、未確認かつ同じ種類のぷよがいるセルを返す
  getNeighboringConnectedCells (row, column) {
    const neighboringConnectedCells = []
    const puyoType = this.getPuyoType(row, column)
    this.getNeighboringCells(row, column).forEach(neighbor => {
      const [neighborRow, neighborColumn] = neighbor
      if (this.needToCheck(neighborRow, neighborColumn) && puyoType === this.getPuyoType(neighborRow, neighborColumn)) {
        neighboringConnectedCells.push([neighborRow, neighborColumn])
        // 連結するセルの場合はチェック済にする
        this.check(neighborRow, neighborColumn)
      }
    })
    return neighboringConnectedCells
  }

  // 上下左右の隣接するセルを返す
  getNeighboringCells (row, column) {
    const neighboringCells = []
    if (row > 0) {
      neighboringCells.push([row - 1, column])
    }
    if (row < this.height - 1) {
      neighboringCells.push([row + 1, column])
    }
    if (column > 0) {
      neighboringCells.push([row, column - 1])
    }
    if (column < this.width - 1) {
      neighboringCells.push([row, column + 1])
    }
    return neighboringCells
  }

  clearCells (cells) {
    cells.forEach(cell => {
      const [row, column] = cell
      this.clear(row, column)
    })
  }

  uncheckAll () {
    for (let i = 0; i < this.height; i++) {
      this.uncheckSingleRow(i)
    }
  }

  uncheckSingleRow (row) {
    this.grid[row].forEach(py => {
      py.uncheck()
    })
  }

  // 下の行から順に落下処理をする
  dropAll () {
    for (let row = this.height - 1; row >= 0; row--) {
      this.dropSingleRow(row)
    }
  }

  dropSingleRow (row) {
    for (let column = 0; column < this.width; column++) {
      this.drop(row, column)
    }
  }

  // ぷよを落下させる
  drop (row, column) {
    const landingRow = this.getLandingRow(row, column)
    if (landingRow === row) {
      return
    }
    this.grid[landingRow][column].type = this.grid[row][column].type
    this.grid[row][column].clear()
  }

  // ぷよの落下行を返す
  getLandingRow (row, column) {
    let landingRow = row
    while (landingRow + 1 < this.height && this.isSpace(landingRow + 1, column)) {
      landingRow++
    }
    return landingRow
  }

  // 指定行、列を任意のタイプに変える
  changeType (row, column, type) {
    this.grid[row][column].type = type
  }

  isAllCleared () {
    return Array.from(Array(this.height).keys()).every(row => {
      return this.isSingleRowCleared(row)
    })
  }

  isPuyoRemaining () {
    return !this.isAllCleared()
  }

  // highestRowを更新する
  setHighestRow () {
    for (let row = 0; row < height; row++) {
      if (!this.isSingleRowCleared(row)) {
        this.highestRow = row
        return
      }
    }
    this.highestRow = this.height
  }

  isSingleRowCleared (row) {
    return this.grid[row].every(py => {
      return py.isSpace()
    })
  }

  copy () {
    const copy = new Field()
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        copy.grid[row][column] = new puyo.Puyo(this.getPuyoType(row, column))
      }
    }
    copy.highestRow = this.highestRow
    return copy
  }

  countSingleRowPuyos (row) {
    return this.grid[row].filter(py => {
      return !py.isSpace()
    }).length
  }

  getPuyoType (row, column) {
    return this.grid[row][column].type
  }

  needToCheck (row, column) {
    return this.grid[row][column].needToCheck()
  }

  check (row, column) {
    this.grid[row][column].check()
  }

  clear (row, column) {
    this.grid[row][column].clear()
  }

  isSpace (row, column) {
    return this.grid[row][column].isSpace()
  }
}

module.exports = {
  Field: Field,
  height: height,
  width: width,
  clearRequirement: clearRequirement,
  sleep: sleep
}
