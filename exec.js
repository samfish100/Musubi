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
    else error(`Statement type ${ast.type} is currently not implemented, it will be ignored`, true, true)
  }

  execExpression(ast) {
    if (ast.type === "reference") return this.execReference(ast)
    else if (ast.type === "number") return new builtIns.Number(ast.value)
    else if (ast.type === "string") return new builtIns.String(ast.value)
    else if (ast.type === "boolean") return new builtIns.Boolean(ast.value === "true")
    else if (ast.type === "null") return new builtIns.Null()

    error(`Expression type ${ast.type} is currently not implemented, it will be replaced with a null`, true, true)
    return new builtIns.Null()
  }

  execReference(ast) {
    var value = this.currentEnv.getValue(ast.name, true)

    if (value instanceof builtIns.Function) {
      var requiredParams = 0
      value.params.forEach(x => { if (x === null || !("default" in x)) requiredParams++ })
      if (ast.params.length < requiredParams) error(`Not enough parameters passed to function ${ast.name} (expected ${(requiredParams < value.params.length ? "at least " : "") + requiredParams}).`, false, true)

      var parameters = {}, returnVal

      // TODO pass thisArg as first parameter (instead of empty object placeholder)
      if (value.body instanceof Function) returnVal = value.body(/*THIS ARG*/{}, ast.params.map(x => this.execExpression(x)))
      else {
        for (let i in value.params) parameters[value.params[i].name] = this.execExpression(ast.params[i])

        returnVal = this.execBlock(value.body, true, parameters)
      }

      return returnVal === undefined ? new builtIns.Null() : returnVal
    } else if (ast.params.length) {
      if (value instanceof builtIns.Null) error("Unexpected parameter list; null is not a function.", false, true)
      error(`Unexpected parameter list${(ast.name ? `; namespace ${ast.name} is not a function` : "")}.`, false, true)
    } else return value
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
