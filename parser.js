const operatorPrecedence = {
  "$" : 18, "." : 18, "[" : 18,
  "**" : 14,
  "*" : 13, "/" : 13, "%" : 13,
  "+" : 12, "-" : 12,
  "<" : 10, ">" : 10, "<=" : 10, ">=" : 10,
  "==" : 9, "!=" : 9,
  "&" : 8,
  "^" : 7,
  "|" : 6,
  "&&" : 5,
  "||" : 4, "??" : 4,
  "?" : 3,
  "+=" : 2, "-=" : 2, "*=" : 2, "/=" : 2, "^=" : 2, "%=" : 2, "&=" : 2, "|=" : 2, "&&=" : 2, "||=" : 2, "**=" : 2, "??=" : 2
}, rightToLeftOperators = [2, 3, 14]

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
      var statement = this.nextStatement(inFunction)
      ast[statement.type === "funcDecl" ? "declarations" : "statements"].push(statement)

      if (this.t.eof()) return ast

      var tok = this.t.peek()
      if (checkForEnd && ((tok.type === "punc" && tok.value === ";") || (tok.type === "keyword" && tok.value === "end"))) {
        this.t.next()

        return ast
      }

      if (!this.t.newLine) error(this.unexpectedToken(this.t.peek().value, "expected a new line, ';', or 'end'"))
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

  nextStatement(inFunction) {
    var tok = this.t.next(), nextTok = this.t.peek(), statement

    if (tok.type === "keyword" && tok.value === "function") statement = this.parseFuncDecl()
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
    var stack = [this.parseNoOpExpression(tok, isNumerical)]

    if (stack[0] === null) return null

    tok = this.t.peek()
    if (this.isTokOperator(tok)) return this.parseOperation(stack)
    else if ("prefix" in stack[0]) return this.parseOperation([], stack[0])

    return stack[0]
  }
  parseNoOpExpression(tok, isNumerical) {
    if (tok.type === "operator" && ["!", "+", "-"].includes(tok.value))
      return {
        prefix : true,
        value : tok.value
      }

    var expression, nextTok = this.t.peek()

    if (tok.type === "string")
      if (!isNumerical)
        expression = {
          type : "string",
          value : tok.value
        }
      else error("Unexpected string, expected a numerical expression.")
    else if (tok.type === "number")
      expression = {
        type : "number",
        value : tok.value
      }
    else if (tok.type === "identifier" && !(nextTok.type === "operator" && nextTok.value === "="))
      expression = this.parseReference(tok)
    else if (tok.type === "punc" && tok.value === "(") {
      var innerExpression = this.parseExpression(this.t.next())

      var parenthesis = this.t.next()
      if (parenthesis.type === "punc" && parenthesis.value === ")") return innerExpression

      error(this.unexpectedToken(parenthesis, "expected ')'"))
    } else if (tok.type === "keyword" && (tok.value === "true" || tok.value === "false")) {
      if (isNumerical) error("Unexpected boolean, expected a numerical expression.")

      expression = {
        type : "boolean",
        value : tok.value
      }
    } else if (tok.type === "keyword" && tok.value === "null") {
      if (isNumerical) error("Unexpected null, expected a numerical expression.")

      expression = { type : "null" }
    } else error(`Unexpected token '${tok.value}'.`)

    return expression
  }

  parseOperation(stack, prefixOp) {
    do {
      var operator, expression
      if (!prefixOp) {
        operator = this.t.next()
        if (operator.value === "[") {
          expression = this.parseExpression(this.t.next(), true)

          var bracket = this.t.next()
          if (bracket.type !== "punc" || bracket.value !== "]") error(this.unexpectedToken(bracket, "expected ']'"))
        } else expression = this.parseNoOpExpression(this.t.next())
      } else {
        operator = prefixOp
        expression = this.parseNoOpExpression(this.t.next())
        prefixOp = false
      }

      if ("prefix" in expression)
        if (expression.prefix) stack.push(null, expression.value)
        else stack.push(expression.value, null)

      if (stack.length > 2 && operatorPrecedence[operator.value] < operatorPrecedence[stack[stack.length - 2]])
        this.mergeStackItems(stack)

      stack.push(operator.value, expression)
    } while (this.isTokOperator(this.t.peek()))

    while (stack.length > 2) this.mergeStackItems(stack)

    return stack
  }
  mergeStackItems(stack) {
    stack.splice(-3, 3, {
      type : "operation",
      operator : stack[stack.length - 2],
      left : stack[stack.length - 3],
      right : stack[stack.length - 1]
    })
  }
  isTokOperator(tok) { return tok.type === "operator" || (tok.value === "[" && tok.type === "punc" && !tok.spaceBefore) }

  parseReference(nameTok) {
    var params = []

    if (!this.t.newLine) {
      var tok = this.t.peek(), paren = false
      if (tok.type === "punc" && tok.value === "(") {
        this.t.next()

        paren = true
      }

      tok = this.t.peek()

      if (paren && tok.type === "punc" && tok.value === ")") this.t.next()
      else {
        params = this.parseExpressionList(paren)

        if (paren) {
          console.log(tok)
          tok = this.t.next()
          if (tok.type !== "punc" || tok.value !== ")") error(this.unexpectedToken(tok, "expected ')'"))
        }
      }
    }

    return {
      type : "reference",
      name : nameTok.value,
      params : params
    }
  }

  parseExpressionList(parens) {
    var expression, expressions = [], tok

    do {
      expression = this.parseExpression(this.t.next())
      expressions.push(expression)

      tok = this.t.peek()

      if (tok.type !== "punc" || tok.value !== ",") {
        if (!parens) break
      } else this.t.next()
    } while (parens ? tok.type !== "punc" || tok.value !== ")" : !this.t.newLine)

    return expressions

    /*var expression = this.parseExpression(this.t.next(), false, true), expressions = [], sawComma = false

    while (expression && (sawComma || parens || !this.t.newLine)) {
      expressions.push(expression)

      var tok = this.t.peek()
      if (tok.type === "punc" && tok.value === ",") {
        this.t.next()

        sawComma = true
      } else sawComma = false

      expression = this.parseExpression(this.t.next(), false, true)
    }
    if (expression) expressions.push(expression)

    return expressions*/
  }

  parseIdentifierList(optional, inFunc) {
    // TODO if inFunc is true check for '= <expression>' to parse optional params
    // TODO rewrite this hairball
    var identifier = this.t.peek(), identifiers = [], sawComma = false

    if (!(identifier.type === "identifier")) {
      if (optional) return identifiers

      error(this.unexpectedToken(identifier, "expected an identifier"))
    }

    while (identifier.type === "identifier") {
      identifier = this.t.next()

      identifiers.push({name : identifier.value /* default : insert ast for param default here */})

      if (this.t.newLine) break

      identifier = this.t.peek()

      if (!sawComma && identifier.type === "punc" && identifier.value === ",") {
        this.t.next()
        identifier = this.t.peek()

        sawComma = true
      } else sawComma = false
    }

    if (sawComma) error("Unexpected ',' at end of identifier list.")

    return identifiers
  }

  parseFuncDecl() {
    var tok = this.t.next()
    if (tok.type === "identifier") var name = tok.value
    else error(this.unexpectedToken(tok, "expected an identifier"))

    var params = this.t.newLine ? [] : this.parseIdentifierList(true, true)

    tok = this.t.peek()
    if (tok.type === "punc" && tok.value === ":") tokenizer.next()
    else if (!this.t.newLine) error(this.unexpectedToken(tok, "expected an identifier, new line, or ':'"))

    return {
      type : "funcDecl",
      name : name,
      params : params,
      body : this.parseCode(true, true)
    }
  }

  parseReturn() {
    return {
      type : "return",
      expression : this.parseExpression(this.t.next(), false)
    }
  }

  parseIf() {
    return {
      type : "if",
      condition : this.parseExpression(this.t.next()),
      body : this.parseCode(true, false)
    }
  }

  parseLoop() {
    return {
      type : "loop",
      times : this.parseExpression(this.t.next(), true),
      body : this.parseCode(true, false)
    }
  }

  unexpectedToken(tok, extra) {
    var token = tok.value ? `token '${tok.value}'` : "<END OF FILE>"

    return `Unexpected ${token}${extra ? ", " + extra : ""}.`
  }
}
