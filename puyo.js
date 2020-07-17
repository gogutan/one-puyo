const puyoTypes = ['　', '🦄', '🐢', '🐬', '🐱']

class Puyo {
  static isValidPuyoType (type) {
    return Number.isInteger(type) && type > 0 && type < puyoTypes.length
  }

  constructor (type) {
    this.type = Puyo.isValidPuyoType(type) ? type : 0
    // 消せるかどうか確認済みなら true
    this.checked = true
  }

  output () {
    process.stdout.write(puyoTypes[this.type])
  }

  clear () {
    this.type = 0
  }

  isSpace () {
    return this.type === 0
  }

  needToCheck () {
    return !this.isSpace() && !this.checked
  }

  check () {
    this.checked = true
  }

  uncheck () {
    this.checked = false
  }
}

module.exports = {
  Puyo: Puyo,
  puyoTypes: puyoTypes
}
