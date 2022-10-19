class Executor {
  constructor(ast) {
    this.ast = ast
  }
  currentEnv = null

  GO() {
    this.globalEnv = this.newEnv(null, this)

    if (this.ast.declarations.length || this.ast.statements.length) this.execBlock(this.ast, false)
  }

  newEnv(parent, global) {
    return this.currentEnv = new Environment(parent || this.currentEnv, global)
  }

  execBlock(block, inFunction, addedVars = {}, env = null) {
    this.newEnv(env)

    for (let i in addedVars) this.currentEnv.setThisValue(i, addedVars[i])

    for (let i of block.declarations)
      this.execFuncDecl(i)

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

  execExpression(ast, retLeft = false) {
    if (ast.type === "operation") return this.execOperation(ast, retLeft)
    else if (ast.type === "identifier") return this.currentEnv.getValue(ast.value, true)
    else if (ast.type === "number") return new this.builtIns.Number(ast.value)
    else if (ast.type === "string") return new this.builtIns.String(ast.value)
    else if (ast.type === "boolean") return new this.builtIns.Boolean(ast.value === "true")
    else if (ast.type === "null") return new this.builtIns.Null()
    else if (ast.type === "array") return new this.builtIns.Array(ast.value.map(x => this.execExpression(x)))

    error(`Expression type ${ast.type} is currently not implemented, it will be replaced with a null.`, true, true)
    return new this.builtIns.Null()
  }

  execOperation(ast, retLeft = false) {
    var {left, right, op} = ast,
        isAssignment = op.endsWith("=") && !["==", "!=", ">=", "<=", "~="].includes(op),
        res, context = null

    if (left && !isAssignment) {
      left = this.execExpression(left, op === "(" && left.op === ".")
      if (Array.isArray(left)) {
        console.log("HI");

        [left, context] = left

        console.log("why it no work", left, context)
      }
    }
    if (right && !["&&", "||", "."].includes(op)) right = this.execExpression(right)

    if (op === "(")
      res = this.execFuncCall(left, ast.extra, context)
    else if (op === "..")
      res = new this.builtIns.String(left.func("toString").value + right.func("toString").value)
      // ARITHMETIC
    else if (op === "+") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Number(left.value + right.value)
      else if (left.is("Array") && right.is("Array")) res = new this.builtIns.Array(left.value.concat(right.value))
      else if (left.is("String") && right.is("String")) res = new this.builtIns.String(left.value + right.value)
      else error(`Cannot add types ${left.name} and ${right.name}.`, false, true)
    } else if (op === "-") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Number(left.value - right.value)
      else error(`Cannot subtract types ${left.name} and ${right.name}.`, false, true)
    } else if (op === "*") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Number(left.value * right.value)
      else error(`Cannot multiply types ${left.name} and ${right.name}.`, false, true)
    } else if (op === "/") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Number(left.value / right.value)
      else error(`Cannot divide types ${left.name} and ${right.name}.`, false, true)
    } else if (op === "**") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Number(left.value ** right.value)
      else error(`Cannot raise type ${left.name} to type ${right.name}.`, false, true)
      // LOGIC
    } else if (op === "&&") {
      if (!left.func("toBoolean").value) res = left
      res = this.execExpression(right)
    } else if (op === "||") {
      if (left.func("toBoolean").value) res = left
      res = this.execExpression(right)
    } else if (op === "!")
      res = new this.builtIns.Boolean(!right.func("toBoolean").value)
      // EQUALITY
    else if (op === "==")
      res = new this.builtIns.Boolean(left === right || left.value === right.value)
    else if (op === "!=")
      res = new this.builtIns.Boolean(left !== right && left.value !== right.value)
    else if (op === "~=")
      res = new this.builtIns.Boolean(left === right || left.func("toString").value === right.func("toString").value)
    else if (op === "<") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Boolean(left.value < right.value)
      else error(`Invalid types ${left.name} and ${right.name} for '<' operator.`)
    } else if (op === ">") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Boolean(left.value > right.value)
      else error(`Invalid types ${left.name} and ${right.name} for '>' operator.`)
    } else if (op === "<=") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Boolean(left.value <= right.value)
      else error(`Invalid types ${left.name} and ${right.name} for '<=' operator.`)
    } else if (op === ">=") {
      if (left.is("Number") && right.is("Number")) res = new this.builtIns.Boolean(left.value >= right.value)
      else error(`Invalid types ${left.name} and ${right.name} for '>=' operator.`)
      // ASSIGNMENT
    } else if (isAssignment) {
      if (left.type === "identifier") {
        this.currentEnv.setValue(left.value, right)

        res = right
      } else if (left.type === "operation" && left.op === ".") {
        var key = left.right

        if (key.type !== "identifier" && !key.parentheses)
          error("Invalid right side of lookup expression.")

        if (key.parentheses) key = this.execExpression(key).func("toString")

        this.execExpression(left.left).setValue(key.value, right)

        res = right
      } else error("Left side of assignment expression is not a reference.", false, true)
      // LOOKUP
    } else if (op === ".") {
      if (right.type !== "identifier" && !right.parentheses)
        error("Invalid right side of lookup expression.")

      if (right.parentheses) right = this.execExpression(right).func("toString")

      res = left.getValue(right.value, true)
    } else if (op === "[") {
      // if (!right.is("Number") || !Number.isInteger(right.value)) error("Lookup index is not an integer.")

      res = left.squareBracketGet(right)
    } else {
      error(`Operator type ${op} is currently not implemented, it will be replaced with a null.`, true, true)
      res = new this.builtIns.Null()
    }

    if (retLeft) return [res, left]
    else return res
  }

  execFuncCall(func, params, thisArg = null) {
    if (!(func instanceof this.builtIns.Function)) problem("Function passed to execFuncCall() is not an instance of builtIns.Function")

    return func.call(thisArg, params.map(x => this.execExpression(x)))

    // if (ast.params.length)
    //   error(`Unexpected parameter list; ${func.func("toString").value} is not a function.`, false, true)
  }

  execFuncDecl(ast) {
    this.currentEnv.setValue(ast.name, new this.builtIns.Function(ast.params, ast.body, this.currentEnv), false)
  }

  execIf(ast) {
    if (this.execExpression(ast.condition).func("toBoolean").value)
      this.execBlock(ast.body)
  }

  execLoop(ast) {
    var times = this.execExpression(ast.times)
    if (!(times instanceof this.builtIns.Number) || times.value < 0 || !Number.isInteger(times.value))
      error("Times to loop for loop statement must be a positive integer.", false, true)

    for (let i = 0; i < times.value; i++) this.execBlock(ast.body)
  }
}

class Environment { // is the executor instance if global, otherwise false
  constructor(parent, execIfGlobal = false) {
    this.parent = parent

    this.content = {}

    if (execIfGlobal)
      execIfGlobal.builtIns = this.builtIns = fillGlobalEnv(this.content, execIfGlobal)
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

  setThisValue(name, value) {
    this.content[name] = value
  }

  getValue(name, mustExist = false) {
    if (name in this.content) return this.content[name]
    else if (this.parent) return this.parent.getValue(name, mustExist)
    else if (mustExist) error(`Namespace ${name} does not exist.`, false, true)

    return new this.builtIns.Null()
  }

  valueExists(name) {
    if (name in this.content) return true
    else if (this.parent) return this.parent.valueExists(name)

    return false
  }
}
