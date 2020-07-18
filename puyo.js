const color = col => str => `\u001b[${col}m${str}\u001b[0m`
const colors = {
  red: color('31'),
  green: color('32'),
  blue: color('34'),
  magenta: color('35')
}
const puyoTypes =
  process.platform === 'darwin'
    ? ['　', '🦄', '🐢', '🐬', '🐱']
    : ['　', colors.red('●'), colors.green('▲'), colors.blue('■'), colors.magenta('★')]

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
