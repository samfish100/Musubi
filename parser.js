const operatorPrecedence = {
  // ~
  "." : 18, ":" : 18, "[" : 18,
  // "$" : 17,
  "(" : 16,
  "!" : 15,
  "**" : 14,
  "*" : 13, "/" : 13, "%" : 13,
  "+" : 12, "-" : 12,
  ".." : 11,
  "<" : 10, ">" : 10, "<=" : 10, ">=" : 10,
  "==" : 9, "!=" : 9,
  "&" : 8,
  "^" : 7,
  "|" : 6,
  "&&" : 5,
  "||" : 4, "??" : 4,
  // "?" : 3,
  "=" : 2, "+=" : 2, "-=" : 2, "*=" : 2, "/=" : 2, "^=" : 2, "%=" : 2, "&=" : 2, "|=" : 2, "&&=" : 2, "||=" : 2, "**=" : 2, "??=" : 2
}
const rightToLeftOperators = [2, 3, 14],
      prefixOperators = ["!", "$", "~"],
      postfixOperators = ["[", "("]

class Parser {
  constructor(t) { this.t = t }

  GO() {
    if (!this.t.eof()) return this.parseCode(false)

    error("Empty program.", true)

    return this.blankAst()
  }

  parseCode(checkForEnd, inFunction = false) {
    var ast = this.blankAst()

    while (!this.t.eof()) {
      var tok = this.t.peek(), singleLine = false

      if (checkForEnd) {
        if (tok.type === "punc" && tok.value === ":") {
          this.t.next()
          singleLine = true
        } else if (!this.t.newLine) error(this.unexpectedToken(tok, "expected a new line or ':' to start code block"))
      }

      var statement = this.nextStatement(inFunction)
      ast[statement.type === "funcDecl" ? "declarations" : "statements"].push(statement)

      if (this.t.eof()) {
        if (checkForEnd && !singleLine) error(`Unterminated ${inFunction ? "function body" : "code block"}.`)

        return ast
      }

      tok = this.t.peek()

      if (singleLine || (checkForEnd && ((tok.type === "punc" && tok.value === ";") || (tok.type === "keyword" && ["end", "elif", "else", "or"].includes(tok.value))))) {
        if (!singleLine && tok.value === "end") this.t.next()

        return ast
      }

      if (!this.t.newLine && !this.t.eof())
        error(this.unexpectedToken(
          this.t.peek(),
          checkForEnd ? "expected a new line, ';', or 'end'" : "expected a new line at the end of statement"
        ))
    }

    error("Empty code block.", true)

    return ast
  }

  blankAst() {
    return {
      declarations : [],
      statements : []
    }
  }

  parseClassCode() {
    var ast = [],
        tok = this.t.next()

    if (tok.type !== "identifier") error(this.unexpectedToken(tok, "expected an identifier for class name"))
    var name = tok.value

    tok = this.t.next()

    while (!(tok.type === "keyword" && tok.value === "end") && !(tok.type === "punc" && tok.value === ";")) {
      var isStatic = false, getter = false, setter = false

      keywordIf: if (tok.type === "keyword") {
        if (tok.value === "static") {
          isStatic = true

          tok = this.t.next()

          if (tok.type !== "keyword") break keywordIf
        }

        if (tok.value === "get") getter = true
        else if (tok.value === "set") setter = true

        if (getter || setter) tok = this.t.next()
      }

      // TODO check for parentheses to parse expression keys
      if (tok.type !== "identifier") error(this.unexpectedToken(tok, "expected an identifier"))

      var nextTok = this.t.peek()

      if (nextTok.type === "operator" && nextTok.value === "=") {
        if (getter || setter) error("Class fields cannot be getters or setters.")

        this.t.next()

        ast.push({
          type : "field",
          isStatic,
          name : tok.value,
          value : this.parseExpression(this.t.next())
        })
      } else {
        var funcDecl = this.parseFuncDecl(false, tok.value)

        funcDecl.type = "method"

        funcDecl.isStatic = isStatic
        funcDecl.getter = getter
        funcDecl.setter = setter

        ast.push(funcDecl)
      }

      tok = this.t.next()
    }

    return {
      type : "class",
      name,
      contents : ast
    }
  }

  nextStatement(inFunction) {
    var tok = this.t.next(), statement

    if (tok.type === "keyword" && tok.value === "function") statement = this.parseFuncDecl()
    else if (tok.type === "keyword" && tok.value === "cache") statement = this.parseFuncDecl(true)
    else if (tok.type === "keyword" && tok.value === "if") statement = this.parseIf()
    else if (tok.type === "keyword" && tok.value === "loop") statement = this.parseLoop()
    else if (tok.type === "keyword" && tok.value === "return") statement = this.parseReturn()
    else
      statement = {
        type : "expression",
        value : this.parseExpression(tok, null)
      }

    return statement
  }

  parseExpression(tok, isNumerical) {
    var stack = []

    this.parseExpressionSegment(tok, isNumerical, stack)

    tok = this.t.peek()

    while (this.isTokOperator(tok) && !postfixOperators.includes(tok.value)) {
      stack.push({op : tok.value})

      this.t.next()
      tok = this.t.next()

      this.parseExpressionSegment(tok, isNumerical, stack)

      tok = this.t.peek()
    }

    var maxMergeAttempts = stack.length

    if (stack.length % 2 === 0) problem("Unexpected expression stack length.")

    while (stack.length > 1) {
      for (let i = 1; i < stack.length - 1; i += 2) {
        var opPrecedence = operatorPrecedence[stack[i].op],
            left = stack[i - 2],
            right = stack[i + 2]

        if ((stack[i - 1] === null && !stack[i].prefix) ||
          (stack[i + 1] === null && !stack[i].postfix))
          opPrecedence = -1
        else if (
          // left side
          (!left || (left.opPrecedence && (left.opPrecedence < opPrecedence + rightToLeftOperators.includes(opPrecedence)))) &&
          // right side
          (!right || (right.opPrecedence && (right.opPrecedence <= opPrecedence - rightToLeftOperators.includes(opPrecedence))))
        ) {
          stack.splice(i - 1, 3, {
            type : "operation",
            left : stack[i - 1],
            right : stack[i + 1],
            extra : stack[i].extra || null,
            op : stack[i].op,
            prefix : Boolean(stack[i].prefix),
            postfix : Boolean(stack[i].postfix)
          })

          break
        }
        
        stack[i].opPrecedence = opPrecedence
      }

      maxMergeAttempts--
      if (maxMergeAttempts <= 0) problem("Unable to parse expression.")
    }

    return stack[0]
  }

  parseExpressionSegment(tok, isNumerical, stack) {
    while (this.isTokOperator(tok) && prefixOperators.includes(tok.value)) {
      stack.push(...this.formatPrefixForStack(tok.value, false))

      tok = this.t.next()
    }

    stack.push(this.parseNoOpExpression(tok, isNumerical))

    tok = this.t.peek()
    while (this.isTokOperator(tok) && postfixOperators.includes(tok.value)) {
      if (tok.value === "(") {
        this.t.next()

        var params = this.parseParameters(true)

        stack.push({op : "(", postfix : true, extra : params}, null)
      } else if (tok.value === "[") {
        this.t.next()

        var index = this.parseExpression(this.t.next())

        tok = this.t.next()
        if (tok.type !== "punc" || tok.value !== "]") error(this.unexpectedToken(tok, "expected ']' to end array access"))

        stack.push({op : "[", postfix : true, extra : index}, null)
      } else {
        this.t.next()

        stack.push(...this.formatPrefixForStack(tok.value, true))
      }

      tok = this.t.peek()
    }
  }

  parseNoOpExpression(tok, isNumerical) {
    if (tok.type === "string")
      if (!isNumerical)
        return {
          type : "string",
          value : tok.value
        }
      else error("Unexpected string, expected a numerical expression.")
    else if (tok.type === "number")
      return {
        type : "number",
        value : tok.value
      }
    else if (tok.type === "identifier")
      return {
        type : "identifier",
        value : tok.value
      }
    else if (tok.type === "punc" && tok.value === "(") {
      var innerExpression = this.parseExpression(this.t.next(), isNumerical)

      innerExpression.parentheses = true

      var parenthesis = this.t.next()
      if (parenthesis.type === "punc" && parenthesis.value === ")") return innerExpression

      error(this.unexpectedToken(parenthesis, "expected ')'"))
    } else if (tok.type === "keyword" && (tok.value === "true" || tok.value === "false")) {
      if (isNumerical) error("Unexpected boolean, expected a numerical expression.")

      return {
        type : "boolean",
        value : tok.value
      }
    } else if (tok.type === "keyword" && tok.value === "null") {
      if (isNumerical) error("Unexpected null, expected a numerical expression.")

      return {type : "null"}
    } else if (tok.type === "keyword" && tok.value === "this") {
      if (isNumerical) error("Unexpected 'this', expected a numerical expression.")

      return {type : "this"}
    } else if (tok.type === "punc" && tok.value === "[") {
      if (isNumerical) error("Unexpected array, expected a numerical expression.")

      tok = this.t.peek()
      if (tok.type === "punc" && tok.value === "]") {
        this.t.next()

        return {
          type : "array",
          value : []
        }
      }

      var values = this.parseExpressionList("]")

      tok = this.t.next()
      if (tok.type !== "punc" || tok.value !== "]") error(this.unexpectedToken(tok, "expected ']' to end array."))

      return {
        type : "array",
        value : values
      }
    } else if (tok.type === "punc" && tok.value === "{") {
      if (isNumerical) error("Unexpected array, expected a numerical expression.")

      var entries = this.parseKVPairs()

      tok = this.t.next()
      if (tok.type !== "punc" || tok.value !== "}") error(this.unexpectedToken(tok, "expected '}' to end hash."))

      return {
        type : "hash",
        value : entries
      }
    } else if (tok.type === "keyword" && tok.value === "function")
      return this.parseFuncDecl()
    else if (tok.type === "keyword" && tok.value === "class")
      return this.parseClassCode()
    else if (tok.type === "keyword" && tok.value === "cache")
      return this.parseFuncDecl(true)
    else
      error(this.unexpectedToken(tok))
  }

  formatPrefixForStack(op, isPost) {
    return isPost
      ? [{postfix : true, op}, null]
      : [null, {prefix : true, op}]
  }

  isTokOperator(tok) {
    return tok.type === "operator" ||
      (tok.value === "[" && tok.type === "punc" && !tok.spaceBefore) ||
      (tok.value === "(" && tok.type === "punc" && !tok.spaceBefore)
  }

  parseParameters(paren = false) {
    var params = []

    var tok = this.t.peek()

    if (paren && tok.type === "punc" && tok.value === ")") this.t.next()
    else if (!this.t.eof()) {
      params = this.parseExpressionList(paren && ")")

      if (paren) {
        tok = this.t.next()
        if (tok.type !== "punc" || tok.value !== ")") error(this.unexpectedToken(tok, "expected ')' to end function call"))
      }
    }

    return params
  }

  parseExpressionList(closeChar) {
    var expression, expressions = [], tok

    do {
      expression = this.parseExpression(this.t.next())
      expressions.push(expression)

      tok = this.t.peek()

      if (tok.type === "punc" && tok.value === ",") this.t.next()
      else if (!closeChar) break
    } while (!closeChar || tok.type !== "punc" || tok.value !== closeChar)

    return expressions
  }

  parseIdentifierList(optional, parens) {
    // TODO if inFunc is true check for '= <expression>' to parse optional params
    var identifier = this.t.peek(), identifiers = []

    if (!(identifier.type === "identifier")) {
      if (optional) return identifiers

      error(this.unexpectedToken(identifier, "expected an identifier"))
    }

    while (identifier.type === "identifier") {
      identifier = this.t.next()

      identifiers.push({name : identifier.value /* default : insert ast for param default here */})

      if (this.t.newLine && !parens) break

      identifier = this.t.peek()

      if (identifier.type === "punc" && identifier.value === ",") {
        this.t.next()
        identifier = this.t.peek()
      }

      if (identifier.type === "punc" && identifier.value === ")") {
        this.t.next()

        break
      }
    }

    return identifiers
  }

  parseKVPairs() {
    var tok = this.t.peek(), pairs = {}

    while (tok.type === "identifier") {
      var key = tok.value
      this.t.next()

      tok = this.t.next()
      if (tok.type === "punc" && tok.value === ":")
        tok = this.t.next()

      pairs[key] = this.parseExpression(tok)

      tok = this.t.peek()
      if (tok.type === "punc" && tok.value === ",") {
        this.t.next()

        tok = this.t.peek()
      }
    }

    return pairs
  }

  parseFuncDecl(cache, name = null) {
    if (cache /* && !name */) this.t.next()

    var tok, parens = false

    if (!name) {
      tok = this.t.next()

      if (tok.type === "identifier") name = tok.value
      else if (tok.type === "keyword") error("Keywords cannot be used as namespaces.")
      else error(this.unexpectedToken(tok, "expected an identifier"))
    }

    tok = this.t.peek()
    if (tok.type === "punc" && tok.value === "(") {
      parens = true
      this.t.next()
    }

    var params = this.t.newLine ? [] : this.parseIdentifierList(true, parens)

    return {
      type : "funcDecl",
      name,
      params,
      body : this.parseCode(true, true),
      cache
    }
  }

  parseReturn() {
    return {
      type : "return",
      expression : this.parseExpression(this.t.next(), false)
    }
  }

  parseIf() {
    var ast = {
          type : "if",
          condition : this.parseExpression(this.t.next()),
          body : this.parseCode(true, false),
          else : null,
          elseOr : null
        },
        tok = this.t.peek()

    ast.ifOr = this.parseIfOr(tok)

    if (tok.type === "keyword") {
      if (tok.value === "else") {
        this.t.next()

        ast.else = this.parseCode(true, false)

        ast.elseOr = this.parseIfOr(this.t.peek())
      } else if (tok.value === "elif") {
        this.t.next()

        ast.else = {
          declarations : [],
          statements : [this.parseIf()]
        }
      }
    }

    return ast
  }

  parseIfOr(tok) {
    if (tok.type === "keyword" && tok.value === "or") {
      this.t.next()

      return {
        condition : this.parseExpression(this.t.next()),
        body : this.parseCode(true, false)
      }
    }

    return null
  }

  parseLoop() {
    return {
      type : "loop",
      times : this.parseExpression(this.t.next(), true),
      body : this.parseCode(true, false)
    }
  }

  unexpectedToken(tok, extra) {
    var token = tok.value ? `'${tok.value}'` : "end of file"

    return `Unexpected ${token}${extra ? ", " + extra : ""}.`
  }
}
