class Executor {
  constructor(ast) {
    this.ast = ast
  }

  GO() {
    this.globalEnv = this.newEnv(true)

    if (this.ast.declarations.length || this.ast.statements.length) this.execBlock(this.ast, false)
  }

  newEnv(global) {
    return this.currentEnv = new Environment(this.currentEnv, global)
  }

  execBlock(block, inFunction, addedVars = {}) {
    this.newEnv()

    for (let i in addedVars) this.currentEnv.setValue(i, addedVars[i])

    if (block.declarations.length)
      for (let i of block.declarations)
        this.execFuncDecl(i)

    if (block.statements.length)
      for (let i of block.statements) {
        this.execStatement(i)

        if (this.return) {
          var returnVal = this.return

          if (inFunction) this.return = null

          return returnVal
        }
      }

    if (this.currentEnv.parent) this.currentEnv = this.currentEnv.parent
  }

  execStatement(ast) {
    if (ast.type === "expression") this.execExpression(ast.value)
    else if (ast.type === "return") this.return = this.execExpression(ast.expression)
    else if (ast.type === "if") this.execIf(ast)
    else if (ast.type === "loop") this.execLoop(ast)
    else error(`Statement type ${ast.type} is currently not implemented, it will be ignored.`, true, true)
  }

  execExpression(ast) {
    if (ast.type === "operation") return this.execOperation(ast)
    else if (ast.type === "identifier") return this.currentEnv.getValue(ast.value, true)
    else if (ast.type === "number") return new builtIns.Number(ast.value)
    else if (ast.type === "string") return new builtIns.String(ast.value)
    else if (ast.type === "boolean") return new builtIns.Boolean(ast.value === "true")
    else if (ast.type === "null") return new builtIns.Null()
    else if (ast.type === "array") return new builtIns.Array(ast.value.map(x => this.execExpression(x)))

    error(`Expression type ${ast.type} is currently not implemented, it will be replaced with a null.`, true, true)
    return new builtIns.Null()
  }

  execOperation(ast) {
    var {left, right, op} = ast,
        isAssignment = op.endsWith("=") && !["==", "!=", ">=", "<=", "~="].includes(op)

    if (left && !isAssignment) left = this.execExpression(left)
    if (right && !["&&", "||", "."].includes(op)) right = this.execExpression(right)

    if (op === "(") {
      return this.execFuncCall(left, ast.extra)
      // ARITHMETIC
    } else if (op === "+") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Number(left.value + right.value)
      else if (left.is("Array") && right.is("Array")) return new builtIns.Array(left.value.concat(right.value))
      else error(`Cannot add types ${left.name} and ${right.name}.`, false, true)
    } else if (op === "-") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Number(left.value - right.value)
      else error(`Cannot subtract types ${left.name} and ${right.name}.`, false, true)
    } else if (op === "*") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Number(left.value * right.value)
      else error(`Cannot multiply types ${left.name} and ${right.name}.`, false, true)
    } else if (op === "/") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Number(left.value / right.value)
      else error(`Cannot divide types ${left.name} and ${right.name}.`, false, true)
    } else if (op === "**") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Number(left.value ** right.value)
      else error(`Cannot raise type ${left.name} to type ${right.name}.`, false, true)
      // LOGIC
    } else if (op === "&&") {
      if (!left.func("toBoolean").value) return left
      return this.execExpression(right)
    } else if (op === "||") {
      if (left.func("toBoolean").value) return left
      return this.execExpression(right)
    } else if (op === "!")
      return new builtIns.Boolean(!right.func("toBoolean").value)
      // EQUALITY
    else if (op === "==")
      return new builtIns.Boolean(left === right || left.value === right.value)
    else if (op === "!=")
      return new builtIns.Boolean(left !== right && left.value !== right.value)
    else if (op === "~=")
      return new builtIns.Boolean(left === right || left.func("toString").value === right.func("toString").value)
    else if (op === "<") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Boolean(left.value < right.value)
      else error(`Invalid types ${left.name} and ${right.name} for '<' operator.`)
    } else if (op === ">") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Boolean(left.value > right.value)
      else error(`Invalid types ${left.name} and ${right.name} for '>' operator.`)
    } else if (op === "<=") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Boolean(left.value <= right.value)
      else error(`Invalid types ${left.name} and ${right.name} for '<=' operator.`)
    } else if (op === ">=") {
      if (left.is("Number") && right.is("Number")) return new builtIns.Boolean(left.value >= right.value)
      else error(`Invalid types ${left.name} and ${right.name} for '>=' operator.`)
      // ASSIGNMENT
    } else if (isAssignment) {
      if (left.type === "identifier") {
        this.currentEnv.setValue(left.value, right)

        return right
      } else if (left.type === "operation" && left.op === ".") {
        var key = left.right

        if (key.type !== "identifier" && !key.parentheses)
          error("Invalid right side of lookup expression.")

        if (key.parentheses) key = this.execExpression(key).func("toString")

        this.execExpression(left.left).setValue(key.value, right)

        return right
      } else error("Left side of assignment expression is not a reference.", false, true)
      // LOOKUP
    } else if (op === ".") {
      if (right.type !== "identifier" && !right.parentheses)
        error("Invalid right side of lookup expression.")

      if (right.parentheses) right = this.execExpression(right).func("toString")

      return left.getValue(right.value, true)
    } else if (op === "[") {
      // if (!right.is("Number") || !Number.isInteger(right.value)) error("Lookup index is not an integer.")

      return left.squareBracketGet(right)
    }

    error(`Operator type ${op} is currently not implemented, it will be replaced with a null.`, true, true)
    return new builtIns.Null()
  }

  execFuncCall(func, params) {
    if (func instanceof builtIns.Function) {
      var requiredParams = 0
      func.params.forEach(x => { if (x === null || !("default" in x)) requiredParams++ })
      if (params.length < requiredParams) error(`Not enough parameters passed to function (expected ${(requiredParams < func.params.length ? "at least " : "") + requiredParams}).`, false, true)

      var parameters = {}, returnVal

      if (func.body instanceof Function) returnVal = func.body(this.currentEnv, params.map(x => this.execExpression(x)))
      else {
        for (let i in func.params) parameters[func.params[i].name] = this.execExpression(params[i])

        returnVal = this.execBlock(func.body, true, parameters)
      }

      return returnVal || new builtIns.Null()
    } else if (ast.params.length)
      error(`Unexpected parameter list; ${func.func("toString").value} is not a function.`, false, true)
  }

  execFuncDecl(ast) {
    this.currentEnv.setValue(ast.name, new builtIns.Function(ast.params, ast.body), false)
  }

  execIf(ast) {
    if (this.execExpression(ast.condition).func("toBoolean").value)
      this.execBlock(ast.body)
  }

  execLoop(ast) {
    var times = this.execExpression(ast.times)
    if (!(times instanceof builtIns.Number) || times.value < 0 || !Number.isInteger(times.value))
      error("Times to loop for loop statement must be a positive integer.", false, true)

    for (let i = 0; i < times.value; i++) this.execBlock(ast.body)
  }
}

class Environment {
  constructor(parent, global) {
    this.parent = parent

    this.content = {}

    if (global) fillGlobalEnv(this.content)
  }

  setValue(name, value, canExist = true, reportResult = false) {
    if (!canExist && this.valueExists(name)) error(`Cannot create namespace ${name} because it already exists.`, false, true)

    if (name in this.content)
      this.content[name] = value
    else if (this.parent) {
      var result = this.parent.setValue(name, value, canExist, true)

      if (result === false) {
        if (reportResult) return false

        this.content[name] = value
      }
    } else if (reportResult) return false

    this.content[name] = value
  }

  getValue(name, mustExist = false) {
    if (name in this.content) return this.content[name]
    else if (this.parent) return this.parent.getValue(name, mustExist)
    else if (mustExist) error(`Namespace ${name} does not exist.`, false, true)

    return new builtIns.Null()
  }

  valueExists(name) {
    if (name in this.content) return true
    else if (this.parent) return this.parent.valueExists(name)

    return false
  }
}
