// TOKEN TYPES: punc, string, number, operator, keyword, identifier

const keywords = [
  "if", "elseif", "else", "or", "loop", "for", "while", "repeat", "end",
  "function", "block", "return", "env",
  "const", "true", "false", "null"
], unimplementedKeywords = ["class", "from", "static", "private", "public", "in"]

class Tokenizer {
  constructor (ch) {
    this.ch = ch
    this.newLine = false
    this.sawSpace = false
  }

  peek() {
    if (this.current) return this.current
    else return this.current = this.nextTok()
  }
  next() {
    var tok = this.peek()

    this.current = null

    var char = this.ch.peek()
    while (char === " ") {
      this.ch.next()

      char = this.ch.peek()
    }
    // this.newLine = char === "\n"

    return tok
  }
  eof () {
    return this.ch.eof()
  }

  nextTok() {
    this.newLine = false

    var char = this.skipSpaces(this.ch.next())

    this.newLine ||= this.eof()

    if (char) {
      if ("()[]{},:;@".includes(char)) return this.formatReturn("punc", char)
      else if ("=+-*/^><&|^%!.\\#?".includes(char)) return this.parseOp(char)
      else if (/[A-Za-z_]/.test(char)) return this.parseIdentifier(char)
      else if (char === "\"" || char === "'") return this.parseString(char)
      else if (/\d/.test(char)) return this.parseNumber(char)
      else error(`Invalid character '${char}'`)
    }

    return this.formatReturn(null, null)
  }
  skipSpaces(char) {
    while (char === " " || char === "\n") {
      this.newLine ||= char === "\n"

      char = this.ch.next()
    }

    return char
  }

  formatReturn(type, value) {
    var spaceBefore = this.sawSpace

    this.sawSpace = this.ch.peek() === " "

    return {
      type : type,
      value : value,
      spaceBefore : spaceBefore
    }
  }

  parseOp(char) {
    var nextChar = this.ch.peek()

    if ("!><+-*/^%&|=".includes(char) && nextChar === "=")
      return this.formatReturn("operator", char + this.ch.next())
    else if ("+-*&|?".includes(char) && nextChar === char) {
      this.ch.next()
      if (("&|*?".includes(char)) && this.ch.peek() === "=")
        return this.formatReturn("operator", char + nextChar + this.ch.next())

      return this.formatReturn("operator", char + nextChar)
    }

    return this.formatReturn("operator", char)
  }

  parseString(stringType) {
    var string = ""

    var char = this.ch.next(false)
    while (char !== stringType || string.slice(-1) === "\\") {
      if (!char || char === "\n") {
        var errorStr = string
        if (errorStr.length > 60) errorStr = string.slice(0, 40) + "..." + string.slice(-17)

        error(`Unterminated string "${errorStr}".`)
      }

      if (string.slice(-1) === "\\") string = string.slice(0, -1)

      string += char

      char = this.ch.next(false)
    }

    return this.formatReturn("string", string)
  }

  parseIdentifier(char) {
    var identifier = char

    var ch = this.ch.peek()
    while (ch && /\w/.test(ch)) {
      identifier += this.ch.next()

      ch = this.ch.peek()
    }

    if (unimplementedKeywords.includes(identifier))
      error(`"${identifier}" is an unimplemented keyword, meaning that it will likely be used in future versions. To maintain compatibility with future versions, avoid using this word.`)

    return this.formatReturn(keywords.includes(identifier) ? "keyword" : "identifier", identifier)
  }

  parseNumber(char) {
    var number = char, canHaveDot = true

    var ch = this.ch.peek()
    while (/[\d]/.test(ch) || ch === "." && canHaveDot) {
      number += this.ch.next()

      if (ch === ".") canHaveDot = false

      ch = this.ch.peek()
    }
    return this.formatReturn("number", parseFloat(number))
  }
}
