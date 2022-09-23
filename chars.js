var line, column

class Characterizer {
  constructor(code) {
    this.lines = code.split("\n")
    line = 0
    column = 0
  }

  peek(checkForComment = true) {
    if (this.eof()) return null

    if (checkForComment)
      return this.checkForComment(this.lines[line].length > column ? this.lines[line].charAt(column) : "\n")
    else
      return this.lines[line].length > column ? this.lines[line].charAt(column) : "\n"
  }
  checkForComment(char) {
    if (char === "/" && this.lines[line].charAt(column + 1) === "/")
      while ((char = this.peek(false)) !== "\n") { this.next(false) }

    return char
  }

  next(checkForComment = true) {
    var char = this.peek(checkForComment)

    if (char === "\n") {
      line++
      column = 0
    } else column++

    return char
  }

  eof() {
    var blankEndLines = 0

    for (let i = this.lines.length - 1; i >= 0; i--) {
      if (this.lines[i].trim().length) break
      else blankEndLines++
    }

    return this.lines.length - blankEndLines - 1 <= line && this.lines[this.lines.length - 1].length <= column
  }
}

function error(msg, isWarn = false, fromExec = false) {
  var lineNums = `line ${line + 1} column ${column}: `,
      preText = `${isWarn ? "WARNING" : "ERROR"}: ${fromExec ? "" : lineNums}`

  if (isWarn) consoleMsg(preText + msg.replace("<", "&lt;"), "warn")
  else throw preText + msg.replace("<", "&lt;")
}

function log(msg) {
  if (typeof msg !== "string") msg = String(msg)

  msg = msg.replace("<", "&lt;")

  if (msg === "") msg = "<i>[Empty string]</i>"
  else if (msg === "\n") msg = "<i>[New line]</i>"
  consoleMsg(msg, "log")
}
