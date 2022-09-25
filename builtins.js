function fillGlobalEnv(env) {
  env.Object = new builtIns.Function([], () => {
    return new builtIns.Object()
  })
  env.Hash = new builtIns.Function([], (_, params) => {
    if (params.length) {
      if (params[0].is("Hash")) error("Parameter for Hash must be a hash or blank.", false, true)

      return new builtIns.Hash(params[0])
    } else return new builtIns.Hash()
  })
  env.Array = new builtIns.Function([], (_, params) => {
    if (params.length) {
      if (params[0].is("Array")) error("Parameter for Array must be an array or blank.", false, true)

      return new builtIns.Array(params[0])
    } else return new builtIns.Array()
  })
  env.String = new builtIns.Function([], (_, params) => new builtIns.String(params.length ? params[0].func("toString").value : ""))
  env.Number = new builtIns.Function([], (_, params) => new builtIns.Number(params.length ? params[0].value : 0))
  env.Boolean = new builtIns.Function([], (_, params) => new builtIns.Boolean(params.length && params[0].func("toBoolean").value))
  env.Null = new builtIns.Function([], () => new builtIns.Null())

  env.getVar = new builtIns.Function([null], (th, params) => {
    if (!params.length || !(params[0].is("String"))) error("Variable/namespace name for getVar must be a string.", false, true)

    if (!th.valueExists(params[0].value)) {
      if (params[1] && params[1].func("toBoolean").value) error("Variable/namespace name for getVar does not exist.", false, true)
      else return new builtIns.Null()
    }

    return th.getValue(params[0].value)
  })
  // move to console.
  env.print = new builtIns.Function([null], (_, params) => {
    for (let i of params) log(i.func("toString").value)
  })
  // move to __debug.
  env.consolePrint = new builtIns.Function([null], (_, params) => {
    if (!globalThis.console || typeof console?.log !== "function") error("Could not locate a console for __debug.print")

    for (let i of params) console.log(i.func("toString").value)
  })
  env.rawConsolePrint = new builtIns.Function([null], (_, params) => {
    if (!globalThis.console || typeof console?.log !== "function") error("Could not locate a console for __debug.rawPrint")

    for (let i of params) console.log(i)
  })
  // move to math.
  env.randBool = new builtIns.Function([], (_, params) => {
    if (params.length && !(params[0].is("Number"))) error("Chance for Math.randBool must be a number or blank (default 0.5).", false, true)

    return new builtIns.Boolean(Math.random() < (params[0]?.value ?? 0.5))
  })
  // move to time.
  env.UTCNow = new builtIns.Function([], () => new builtIns.Number(Date.now() / 1000))
}

var builtIns = {}, fields = {}
class Base {
  dataIsCopy = false

  get value() {
    if (this.valueExists("__value")) {
      if (!this.valueExists("__is")) error("'__value' block requires the existence of an '__is' block in the same object.")

      var valueFunc = this.getValue("__value")
      if (!(valueFunc.is("Block"))) error("'__value' property must be a block (or not defined).", false, true)

      var res = valueFunc.call()
      if (!(res.is(this.getName()))) error("Return value of '__value' block must be of the type specified by '__is'.")

      return res.value
    } else return this._value
  }
  set value(val) { this._value = val }

  setThisValue(name, value) {
    if (!this.dataIsCopy) {
      var oldData = this.data

      this.data = {}
      Object.assign(this.data, oldData)
    }

    this.data[name] = value
  }

  setValue(name, value, reportResult) {
    if (name in this.data)
      this.setThisValue(name, value)
    else if ("parent" in this) {
      var result = this.parent.setValue(name, value, true)

      if (result === false) {
        if (reportResult) return false

        this.setThisValue(name, value)
      }
    } else if (reportResult) return false

    this.setThisValue(name, value)
  }

  getValue(name) {
    if (name in this.data && this.data[name] instanceof Base) return this.data[name]
    else if ("parent" in this) return this.parent.getValue(name)

    return new builtIns.Null()
  }

  valueExists(name) {
    if (name in this.data) return true
    else if ("parent" in this) return this.parent.valueExists(name)

    return false
  }

  is(type) {
    if (type === this.getName()) return true

    var current = this
    while ("parent" in current) {
      current = current.parent
      
      if (type === current.getName()) return true
    }

    return false
  }

  getName() {
    if (this.valueExists("__is")) {
      var isFunc = this.getValue("__is")
      if (!(isFunc.is("Block"))) error("'__is' property must be a block (or not defined).", false, true)

      var res = isFunc.call()
      if (!(res.is("String"))) error("'__is' block must return a string.")

      return res.value
    } else return this.name
  }

  func(name, params = [], th = this) { return this.getValue(name).body(th, params) }
}

/*

TEMPLATE:

fields.CLASS_NAME = {}
builtIns.CLASS_NAME = class extends Base {
  constructor(PARAMETERS) {
    super()

  }
  parent = new builtIns.PARENT_CLASS()
  data = fields.CLASS_NAME
  name = "EXTERNAL_NAME"
}

*/

fields.Object = {}
builtIns.Object = class extends Base {
  constructor() { super() }
  data = fields.Object
  name = "Object"
}

fields.Hash = {}
builtIns.Hash = class extends Base {
  constructor(value = {}) {
    super()

    Object.assign(this._value, value)
  }
  parent = new builtIns.Object()
  data = fields.Hash
  name = "Hash"

  _value = {}
}

fields.Array = {}
builtIns.Array = class extends Base {
  constructor(value = []) {
    super()
    this._value = value
  }
  parent = new builtIns.Object()
  data = fields.Array
  name = "Array"
}

fields.String = {}
builtIns.String = class extends Base {
  constructor(content = "") {
    super()
    this._value = String(content)
  }
  parent = new builtIns.Object()
  data = fields.String
  name = "String"
}

fields.Number = {}
builtIns.Number = class extends Base {
  constructor(value = 0) {
    super()
    if (typeof value === "number") this._value = value
    else if (typeof value === "string" && /^\d*(\.\d+)?(e\+?\d+)?$/.test(value)) this._value = parseFloat(value)
    else error(`Unable to convert expression to number${typeof value === "string" ? `: "${value}"` : ""}.`, false, true)
  }
  parent = new builtIns.Object()
  data = fields.Number
  name = "Number"
}

fields.Boolean = {}
builtIns.Boolean = class extends Base {
  constructor(value) {
    super()
    this._value = Boolean(value)
  }
  parent = new builtIns.Object()
  data = fields.Boolean
  name = "Boolean"
}

fields.Null = {}
builtIns.Null = class extends Base {
  constructor() {
    super()
  }
  _value = null
  parent = new builtIns.Object()
  data = fields.Null
  name = "Null"
}

fields.Function = {}
builtIns.Function = class extends Base {
  constructor(params, body, thisArg) {
    super()
    this.params = params
    this.body = body
    this.thisArg = thisArg
  }
  parent = new builtIns.Object()
  data = fields.Function
  name = "Function"

  call(thisArg, params) {
    var env = thisArg ?? this.thisArg

    if (!env) problem("Could not find an environment to run function in.")

    // TODO complete call func
  }
  bind(thisArg) { this.thisArg = thisArg }
}

fields.Block = {}
builtIns.Block = class extends Base {
  constructor(params, body) {
    super()
  }
  parent = new builtIns.Function()
  data = fields.Block
  name = "Block"
}

fields.Class = {}
builtIns.Class = class extends Base {
  constructor(name, params, body) {
    super()
    this.params = params
    this.body = body
  }
  parent = new builtIns.Function()
  data = fields.Class
  name = "Class"
}

/*

ERROR TEMPLATE:

fields.ERROR_NAME = {}
builtIns.ERROR_NAME = class extends Base {
  constructor(type, msg) {
    super()

    this.type = type ?? new builtIns.Null()
    this.msg = msg ?? new builtIns.String(this.getValue("default"))
  }
  parent = new builtIns.Error()
  data = fields.ERROR_NAME
  name = "ERROR_TYPE Error"
  default = "DEFAULT_ERROR_MSG"
}

*/
fields.Error = {}
builtIns.Error = class extends Base {
  constructor(type, msg) {
    super()

    this.type = type ?? new builtIns.Null()
    this.msg = msg ?? new builtIns.String(this.getValue("default"))

    this.line = line
    this.column = column
  }
  parent = new builtIns.Object()
  data = fields.Error
  name = "Error"
  default = "Unknown error"
}
fields.SyntaxError = {}
builtIns.SyntaxError = class extends Base {
  constructor(type, msg) {
    super()

    this.type = type ?? new builtIns.Null()
    this.msg = msg ?? new builtIns.String(this.getValue("default"))
  }
  parent = new builtIns.Error()
  data = fields.SyntaxError
  name = "Syntax Error"
  default = "Unexpected token"
}
fields.ReferenceError = {}
builtIns.ReferenceError = class extends Base {
  constructor(type, msg) {
    super()

    this.type = type ?? new builtIns.Null()
    this.msg = msg ?? new builtIns.String(this.getValue("default"))
  }
  parent = new builtIns.Error()
  data = fields.ReferenceError
  name = "Reference Error"
  default = "Unknown namespace"
}
fields.TypeError = {}
builtIns.TypeError = class extends Base {
  constructor(type, msg) {
    super()

    this.type = type ?? new builtIns.Null()
    this.msg = msg ?? new builtIns.String(this.getValue("default"))
  }
  parent = new builtIns.Error()
  data = fields.TypeError
  name = "Type Error"
  default = "Unexpected expression type"
}

fields.Object.stringName = new builtIns.Function([], th => new builtIns.String(th.name))
fields.Object.stringPath = new builtIns.Function([], (th, params) => {
  var delimiter = "."
  if (params[0].is("String")) delimiter = params[0].value
  else if (params.length) error("Delimiter for [Object].stringPath must be a string or blank.", false, true)

  if (!("parent" in th)) return new builtIns.String(th.name)

  return new builtIns.String(th.parent.func("stringPath", [delimiter]).value + delimiter + th.name)
})
  fields.Object.isString =
  fields.Object.isNumber =
  fields.Object.isBoolean =
  fields.Object.isNull =
  fields.Object.isFunction =
  fields.Object.isClass =
  /*fields.Object.isInstance =*/ new builtIns.Function([], () => new builtIns.Boolean(false))
fields.Object.toString = new builtIns.Function([], th => new builtIns.String(`[${th.name}]`))
fields.Object.toBoolean = new builtIns.Function([], () => new builtIns.Boolean(true))
fields.Object.type = new builtIns.Function([], th => new builtIns.String(th.getName().toLowerCase()))
fields.Object.trueType = new builtIns.Function([], th => new builtIns.String(th.name.toLowerCase()))
fields.Object.properties = new builtIns.Function([], th => new builtIns.Array(Object.keys(th.data).map(x => new builtIns.String(x))))
fields.Object.propertyValues = new builtIns.Function([], th => new builtIns.Array(Object.values(th.data)))

fields.Hash.toString = new builtIns.Function([], (th, params) => {
  if (params[0] && !(params[0].is("String"))) error("First parameter for [Hash].toString must be a string or blank.", false, true)

  if (params[1] && !(params[1].is("String"))) error("Second parameter for [Hash].toString must be a string or blank.", false, true)

  var str = "", colon = params[0]?.value ?? ": ", comma = params[1]?.value ?? ", "

  var keys = Object.keys(th.value)
  for (let i in keys) {
    str += keys[i] + colon + th.value[keys[i]]
    if (i < keys.length - 1) str += comma
  }

  return new builtIns.String(`{${str}}`)
})
fields.Hash.keys = new builtIns.Function([], th => new builtIns.Array(Object.keys(th.value).map(x => new builtIns.String(x))))
fields.Hash.values = new builtIns.Function([], th => new builtIns.Array(Object.values(th.value)))
fields.Hash.length = new builtIns.Function([], th => new builtIns.Number(Object.keys(th.value).length))

fields.Array.isArray = new builtIns.Function([], () => new builtIns.Boolean(true))
fields.Array.toString = new builtIns.Function([], (th, params) => {
  var delimiter = ", "
  if (params.length)
    if (params[0].is("String")) delimiter = params[0].value
    else error("Delimiter for [Array].toString must be a string or blank.")

  return new builtIns.String(`[${th.value.map(x => x.func("toString").value).join(delimiter)}]`)
})
fields.Array.length = new builtIns.Function([], th => new builtIns.Number(th.value.length))
fields.Array.reverse = new builtIns.Function([], th => new builtIns.Array(th.value.sort(() => false)))

fields.String.isString = new builtIns.Function([], () => new builtIns.Boolean(true))
fields.String.toString = new builtIns.Function([], th => th)
fields.String.length = new builtIns.Function([], th => new builtIns.Number(th.value.length))
fields.String.toBoolean = new builtIns.Function([], th => new builtIns.Boolean(th.value.length))
fields.String.spread = new builtIns.Function([], th => new builtIns.Array([...th.value]))
fields.String.reverse = new builtIns.Function([], th => new builtIns.String([...th.value].sort(() => false).join("")))
fields.String.slice = new builtIns.Function([], (th, params) => {
  var start = 0, end = this.value.length

  if (params[0]) {
    if (!params[0].is("Number") || params[0].value < 0)
      error("Start position for [String].slice must be an integer or blank (default start of string).", false, true)

    start = params[0].value
  }
  if (params[1]) {
    if (!params[1].is("Number") || params[1].value < 0)
      error("End position for [String].slice must be an integer or blank (default end of string).", false, true)

    end = params[1].value
  }

  return new builtIns.String(th.value.slice(start, end))
})

fields.Number.isInt = new builtIns.Function([], th => new builtIns.Boolean(Number.isInteger(th.value)))
fields.Number.isNumber = new builtIns.Function([], () => new builtIns.Boolean(true))
fields.Number.toString = new builtIns.Function([], th => new builtIns.String(th.value))
fields.Number.toBoolean = new builtIns.Function([], th => new builtIns.Boolean(th.value))

fields.Boolean.isBoolean = new builtIns.Function([], () => new builtIns.Boolean(true))
fields.Boolean.toString = new builtIns.Function([], th => new builtIns.String(th.value))
fields.Boolean.toBoolean = new builtIns.Function([], th => th)

fields.Null.isNull = new builtIns.Function([], () => new builtIns.Boolean(true))
fields.Null.toString = new builtIns.Function([], () => new builtIns.String("null"))
fields.Null.toBoolean = new builtIns.Function([], () => new builtIns.Boolean(false))

fields.Function.toString = new builtIns.Function([], th => new builtIns.String(`function [${th.body instanceof Function ? "native code" : "body"}]`))

fields.Block.call = new builtIns.Function([], (th, params) => {
  if (params[0] && !params[0].is("Null")) error("\"this\" argument for [Block].call is currently not implemented, it will be ignored.", true, true)
  if (params[1] && !params[1].is("Array")) error("Parameter values for [Block].call must be an array or blank.", false, true)

  th.call(/*thisArg*/null, params[1].value)
})
