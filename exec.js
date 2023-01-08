class Executor {
  constructor(ast) {
    this.ast = ast
  }

  currentEnv = null

  GO() {
    this.globalEnv = this.newEnv(null, this)

    this.thisValue = new this.builtIns.Null()

    if (this.ast.declarations.length || this.ast.statements.length) this.execBlock(this.ast, false)
  }

  newEnv(parent, global = false) {
    return this.currentEnv = new Environment(parent || this.currentEnv, global)
  }

  execBlock(block, inFunction, addedVars = {}, env = null, thisValue = null) {
    var oldEnv = this.currentEnv,
        oldThis = this.thisValue,
        returnVal

    if (thisValue)
      this.thisValue = thisValue

    this.newEnv(env)

    for (let i in addedVars) this.currentEnv.setThisValue(i, addedVars[i])

    for (let i of block.declarations)
      this.execFuncDecl(i)

    for (let i of block.statements) {
      this.execStatement(i)

      if (this.return) {
        returnVal = this.return

        if (inFunction) this.return = null

        break
      }
    }

    this.currentEnv = oldEnv
    this.thisValue = oldThis

    return returnVal
  }

  execStatement(ast) {
    if (ast.type === "expression") this.execExpression(ast.value)
    else if (ast.type === "return") this.return = this.execExpression(ast.expression)
    else if (ast.type === "if") this.execIf(ast)
    else if (ast.type === "loop") this.execLoop(ast)
    else error(`Statement type ${ast.type} is currently not implemented, it will be ignored.`, true, true)
  }

  execExpression(ast, retLeft = false, thisValue = null) {
    var oldThis = this.thisValue
    if (thisValue) this.thisValue = thisValue

    var returnVal

    if (ast.type === "operation") returnVal = this.execOperation(ast, retLeft)
    else if (ast.type === "identifier") returnVal = this.currentEnv.getValue(ast.value, true)
    else if (ast.type === "number") returnVal = new this.builtIns.Number(ast.value)
    else if (ast.type === "string") returnVal = new this.builtIns.String(ast.value)
    else if (ast.type === "boolean") returnVal = new this.builtIns.Boolean(ast.value === "true")
    else if (ast.type === "null") returnVal = new this.builtIns.Null()
    else if (ast.type === "array") returnVal = new this.builtIns.Array(ast.value.map(x => this.execExpression(x)))
    else if (ast.type === "hash")
      returnVal = new this.builtIns.Hash(
        Object.fromEntries(Object.entries(ast.value).map(x => [x[0], this.execExpression(x[1], false)]))
      )
    else if (ast.type === "class") returnVal = this.execClass(ast)
    else if (ast.type === "this") returnVal = this.thisValue
    else {
      error(`Expression type ${ast.type} is currently not implemented, it will be replaced with a null.`, true, true)
      returnVal = new this.builtIns.Null()
    }

    if (thisValue) this.thisValue = oldThis

    return returnVal
  }

  execOperation(ast, retLeft = false) {
    var {left, right, op} = ast,
        isAssignment = op.endsWith("=") && !["==", "!=", ">=", "<=", "~="].includes(op),
        res, context = null

    console.log(ast)

    if (left && !isAssignment) {
      left = this.execExpression(left, op === "(" && (left.op === "." || left.op === "["))

      if (Array.isArray(left)) [left, context] = left
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
      else res = this.execExpression(right)
    } else if (op === "||") {
      if (left.func("toBoolean").value) res = left
      else res = this.execExpression(right)
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
    } else if (op === "[")
      res = left.squareBracketGet(this.execExpression(ast.extra))
    else {
      error(`Operator type ${op} is currently not implemented, it will be replaced with a null.`, true, true)
      res = new this.builtIns.Null()
    }

    if (retLeft) return [res, left]
    else return res
  }

  execFuncCall(func, params, thisArg = null) {
    if (!(func instanceof this.builtIns.Function))
      error(`Attempting to call a non-function value: ${func.func("toString").value}.`, false, true)

    return func.call(thisArg, params.map(x => this.execExpression(x)))
  }

  execFuncDecl(ast) {
    this.currentEnv.setValue(ast.name, new this.builtIns.Function(
      ast.params, ast.body, this.currentEnv, null, ast.cache
    ), false)
  }

  execClass(ast) {
    var classContents = [[], [], [], []] // methods, fields, static methods, static fields

    for (let i of ast.contents) {
      var index = i.type === "field" ? 1 : 0

      if (i.isStatic) {
        if (i.type === "field")
          classContents[index + 2].push({
            name : i.name,
            value : this.execExpression(i.value)
          })
        else
          classContents[index + 2].push({
            name : i.name,
            value : new this.builtIns.Function(i.params, i.body, this.currentEnv, null, false /* TODO cache static class methods */)
          })
      } else classContents[index].push(i)
    }

    console.log(classContents)

    var cl = new this.builtIns.Class(ast.name, ...classContents /* TODO parse superclasses with 'extends' keyword */)

    this.currentEnv.setValue(ast.name, cl, false)

    return cl
  }

  execIf(ast) {
    var cond = this.execExpression(ast.condition).func("toBoolean").value

    if (cond) this.execBlock(ast.body)

    if (ast.ifOr && (cond || this.execExpression(ast.ifOr.condition).func("toBoolean").value))
      this.execBlock(ast.ifOr.body)

    if (ast.else && !cond) this.execBlock(ast.else)

    if (ast.elseOr && (!cond || this.execExpression(ast.elseOr.condition).func("toBoolean").value))
      this.execBlock(ast.elseOr.body)
  }

  execLoop(ast) {
    var times = this.execExpression(ast.times)
    if (!times.is("Number") || times.value < 0 || !Number.isInteger(times.value))
      error("Times to loop for loop statement must be a positive integer.", false, true)

    for (let i = 0; i < times.value; i++) this.execBlock(ast.body)
  }
}

class Environment { // v is the executor instance if global, otherwise false
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
