function fillGlobalEnv(env, exec) {
  var builtIns = {}, fields = {}

  function validatePropertySettings(obj, name, value) {
    if (obj.getter && obj.setter)
      problem(`Property cannot be a getter and a setter: '${name}'`)

    if (value && (obj.getter || obj.setter) && !value.is("Function"))
      problem(`Getter/setter property value must be a function: '${name}'`)
  }

  class Base {
    primitive = false

    dataIsCopy = false

    get value() {
      if (this.valueExists("__value")) {
        // if (!this.valueExists("__is")) error("'__value' function requires the existence of an '__is' function in the same object.", false, true)

        var valueFunc = this.getValue("__value")
        if (!(valueFunc.is("Function"))) error("'__value' property must be a function (or not defined).", false, true)

        var res = valueFunc.call(this, [])
        if (!(res.is(this.getName()))) error("Unexpected type returned by '__value' function.", false, true)

        return res.value
      } else return this._value
    }
    set value(val) { this._value = val }

    setThisValue(name, value, propertySettings = {}) {
      if (this.primitive) error(`Cannot set a property of a primitive (${this.getName()}).`, false, true)

      if (!this.dataIsCopy) {
        var oldData = this.data

        this.data = {}
        Object.assign(this.data, oldData)

        this.dataIsCopy = true
      }

      validatePropertySettings(propertySettings, name, value)

      var {getter, setter, writable, changeable} = propertySettings,
          originalSettings = this.data[name]

      this.data[name] = {
        value : getter || setter ? null : value,
        getter : getter ? value : null,
        setter : setter ? value : null,
        writable : writable ?? originalSettings.writable,
        changeable : changeable ?? originalSettings.changeable,
        private : propertySettings.private ?? originalSettings.private
      }
    }

    setValue(name, value, reportResult = false, propertySettings = {}, force = false) {
      if (this.primitive) error(`Cannot set a property of a primitive (${this.getName()}).`, false, true)

      if (name in this.data) {
        if (!this.data[name].writable && !force) error(`Cannot assign to non-writable property '${name}'.`, false, true)

        if (this.data[name].setter) this.data[name].setter.call(this, [value])
        else if (this.data[name].getter) error(`Cannot assign to a property that has a getter but no setter '${name}'.`)

        this.setThisValue(name, value, propertySettings)
      } else if (this.parent) {
        var result = this.parent.setValue(name, value, true)

        if (result === false) {
          if (reportResult) return false

          // TODO check for setter here
          this.setThisValue(name, value)
        }
      } else if (reportResult) return false

      this.setThisValue(name, value)
    }

    getValue(name, mustExist = false) {
      //                       ignore default properties like 'constructor'
      if (name in this.data && typeof this.data[name] !== "function") {
        var prop = this.data[name]

        if (prop.private) error(`Attempting to access private property '${name}'`)

        if (prop.getter) return prop.getter.call(this, [])

        return prop.value
      } else if (this.parent) return this.parent.getValue(name, mustExist)
      else if (mustExist) error(`Property '${name}' does not exist.`, false, true)

      return new builtIns.Null()
    }

    deleteValue(name, mustExist = false) {
      if (name in this.data) {
        delete this.data[name]

        return new builtIns.Boolean(true)
      } else if (this.parent) return this.parent.deleteValue()
      else if (mustExist) error(`Cannot delete property '${name}' because it does not exist.`, false, true)

      return new builtIns.Boolean()
    }

    getPropertyData(name) {
      if (name in this.data && this.data[name].value)
        return this.data[name]
      else if (this.parent)
        return this.parent.getPropertyData(name)

      return null
    }

    valueExists(name) {
      if (name in this.data) return true
      else if (this.parent) return this.parent.valueExists(name)

      return false
    }

    findParentWithValue(name) {
      if (name in this.data) return this
      else if (this.parent) return this.parent.findParentWithValue(name)

      return null
    }

    squareBracketGet(val) {
      if (this.valueExists("__get")) {
        var getFunc = this.getValue("__get")

        if (!getFunc.is("Function")) error("'__get' property must be a function.", false, true)

        return getFunc.call(this, [val, this._get?.(val) || new builtIns.Null(), this])
      } else if (this._get)
        return this._get(val)
      else
        error(`Type ${this.getName()} does not support the '[' operator.`)
    }

    is(type) {
      if (type === this.getName()) return true

      var current = this
      while (current.parent) {
        current = current.parent

        if (type === current.getName()) return true
      }

      return false
    }

    getName() {
      if (this.valueExists("__is")) {
        var isFunc = this.getValue("__is")
        if (!(isFunc.is("Function"))) error("'__is' property must be a function (or not defined).", false, true)

        var res = isFunc.call()
        if (!(res.is("String"))) error("'__is' function must return a string.")

        return res.value
      } else return this.name
    }

    toStringExtra = null

    getToStringExtra() {
      if (this.valueExists("__toStringExtra")) {
        var stringExtra = this.getValue("__toStringExtra")

        if (stringExtra.is("Function")) stringExtra = stringExtra.call(this)
        return stringExtra.func("toString").value
      }

      return this.toStringExtra
    }

    func(name, params = [], th) {
      return this.getValue(name, true).call(th || this, params)
    }

    _langClass = true
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
    data = fields.Object
    name = "Object"
  }

  fields.Hash = {}
  builtIns.Hash = class extends Base {
    constructor(value = {}) {
      super()

      Object.assign(this._value, value /* Object.fromEntries(Object.entries(value).map(
        x => [x[0], exec.execExpression(x[1], false, this)]
      )) */)
    }
    parent = new builtIns.Object()
    data = fields.Hash
    name = "Hash"

    toStringExtra() {
      var keyCount = Object.keys(this.value).length

      return `- ${keyCount} pair${keyCount === 1 ? "" : "s"}`
    }

    _value = {}

    _get(val) {
      if (val.is("String")) return this._value[val.value] || new builtIns.Null()

      if (val.is("Number")) return this._value[val.func("toString").value] || new builtIns.Null()

      error(`Cannot get key of type ${val.getName()} out of hash.`, false, true)
    }
  }

  fields.Array = {}
  builtIns.Array = class extends Base {
    constructor(value = []) {
      super()

      this._value = value // value.map(x => exec.execExpression(x, false, this))
    }
    parent = new builtIns.Object()
    data = fields.Array
    name = "Array"

    _get(val) {
      if (val.is("Number")) {
        var index = val.value

        if (!Number.isInteger(index)) error(`Non-integer array index: ${index}.`, false, true)

        if (index < 0) index += this._value.length

        if (index < 0 || index >= this._value.length) return new builtIns.Null()

        return this._value[index]
      }

      error(`Unexpected array index type ${val.getName()}, expected a number.`, false, true)
    }
  }

  fields.String = {}
  builtIns.String = class extends Base {
    constructor(content = "") {
      super()

      this._value = String(content)
    }
    primitive = true
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
      else problem(`Unable to convert expression to number${typeof value === "string" ? `: "${value}"` : ""}.`, false, true)
    }
    primitive = true
    parent = new builtIns.Object()
    data = fields.Number
    name = "Number"
  }

  fields.Boolean = {}
  builtIns.Boolean = class extends Base {
    constructor(value = false) {
      super()

      this._value = Boolean(value)
    }
    primitive = true
    parent = new builtIns.Object()
    data = fields.Boolean
    name = "Boolean"
  }

  fields.Null = {}
  builtIns.Null = class extends Base {
    primitive = true
    _value = null
    parent = new builtIns.Object()
    data = fields.Null
    name = "Null"
  }

  fields.Function = {}
  builtIns.Function = class extends Base {
    constructor(params, body, environment, thisArg, cache) {
      super()

      this.params = params
      this.body = body
      this.env = environment || env
      this.thisArg = thisArg || exec.thisValue

      this.doCache = cache
      this.cache = []
    }
    parent = new builtIns.Object()
    data = fields.Function
    name = "Function"

    call(thisArg, params) {
      if (!Array.isArray(params)) problem("Params is not an array (builtIns.Function.call)")

      var env = thisArg || this.thisArg

      // if (!env) problem("Could not find an environment to run function in.")

      var requiredParams = 0
      this.params.forEach(x => {
        if (x === null || !("default" in x)) requiredParams++
      })
      if (params.length < requiredParams)
        error(`Not enough parameters passed to function (expected ${(requiredParams < this.params.length ? "at least " : "") + requiredParams}).`, false, true)

      outer: for (let i of this.cache) {
        var len = Math.max(i.params.length, params.length)

        for (let j = 0; j < len; j++)
          if (i.params[j] !== params[j] && i.params[j]._value !== undefined && params[j]._value !== undefined && i.params[j]._value !== params[j]._value)
            continue outer

        return i.value
      }

      var returnVal
      if (this.body instanceof Function) returnVal = this.body(env, params)
      else
        returnVal = exec.execBlock(
          this.body, // code to run
          true,      // is code in function
          Object.fromEntries(params.map( // parameters
            (value, i) => this.params[i] ? [this.params[i].name, value] : null
          ).filter(Boolean)),
          this.env,  // env to run body in
          env        // the object accessed when 'this' keyword is used
        )

      if (this.doCache)
        this.cache.push({
          params, value : returnVal
        })

      return returnVal || new builtIns.Null()
    }

    bind(thisArg) { this.thisArg = thisArg }
  }

  fields.Class = {}
  builtIns.Class = class extends Base {
    constructor(name, methods, fields, staticMethods, staticFields, superclass) {
      super()

      this.name = name

      this.methods = methods || []
      this.fields  = fields  || []

      for (let i of staticMethods) {
        this.setThisValue(i.name, i.value, {
          getter : i.getter,
          setter : i.setter,
          writable : false
        })
      }
      
      for (let i of staticFields)
        this.setThisValue(i.name, i.value)

      this.superclass = superclass || null
      
      this.env = exec.currentEnv
    }
    parent = new builtIns.Object()
    data = fields.Class
    name = "Class"

    new(args) { return new builtIns.Instance(this, args) }
  }

  fields.Instance = {}
  builtIns.Instance = class extends Base {
    constructor(cl, args) {
      super()

      for (let i of cl.methods)
        this.setThisValue(i.name, new builtIns.Function(i.params, i.body, cl.env, cl), {
          getter : i.getter,
          setter : i.setter,
          writable : false
        })

      for (let i of cl.fields)
        this.setThisValue(i.name, exec.execExpression(i.value))

      this.class = cl

      this.requireSuperCall = cl.superclass
    }
    parent = new builtIns.Object()
    data = fields.Instance
    name = "Instance"

    superCall(args) {
      var supercl = this.class.superclass

      if (!supercl) error("Cannot call 'super()' in a class that does not have a superclass.")
      if (!this.requireSuperCall) error("Cannot call 'super()' more than once per instance.")

      this.superclass = supercl.new(args)
    }

    setValue(name, value, reportResult = false, propertySettings = {}, force = false) {
      if (this.requireSuperCall)
        error(`Value ${name} cannot be set until 'super()' is called.`, false, true)

      var instance = this

      while (instance) {
        if (name in this.data) this.setThisValue(name, value)

        instance = instance.superclass
      }
    }
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
  /*fields.Error = {}
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
  }*/

  function fn(field, name, args, fn, propertySettings = {}) {
    validatePropertySettings(propertySettings, name)

    var value = new builtIns.Function(Array(args).fill(null), fn),
        {getter, setter, writable, changeable} = propertySettings

    fields[field][name] = {
      value : getter || setter ? null : value,
      getter : getter ? value : null,
      setter : setter ? value : null,
      writable : writable ?? false,
      changeable : changeable ?? true,
      private : propertySettings.private ?? false
    }
  }

  fn("Object", "toString", 0, th => {
    var extra = th.getToStringExtra()
    if (extra !== null) return new builtIns.String(`[${th.getName()} ${extra}]`)

    new builtIns.String(`[${th.getName()}]`)
  })
  // fields.Object.toString = new builtIns.Function([], th => new builtIns.String(`[${th.getName()}]`))
  fn("Object", "toBoolean", 0, () => new builtIns.Boolean(true))
  // fields.Object.toBoolean = new builtIns.Function([], () => new builtIns.Boolean(true))
  fn("Object", "type", 0, th => new builtIns.String(th.getName().toLowerCase()), {getter : true})
  // fields.Object.type = new builtIns.Function([], th => new builtIns.String(th.getName().toLowerCase()))
  fn("Object", "trueType", 0, th => new builtIns.String(th.name.toLowerCase()), {getter : true})
  // fields.Object.trueType = new builtIns.Function([], th => new builtIns.String(th.name.toLowerCase()))
  fn("Object", "typeInheritance", 0, (th, params) => {
    var delimiter = "."
    if (params[0] && params[0].is("String")) delimiter = params[0].value
    else if (params.length) error("Delimiter for [Object].typeInheritance must be a string or blank.", false, true)

    if (!("parent" in th)) return new builtIns.String(th.name.toLowerCase())

    return new builtIns.String(th.parent.func("typeInheritance", [delimiter]).value + delimiter + th.name.toLowerCase())
  }, {getter : true})
  // fields.Object.typeInheritance = new builtIns.Function([], (th, params) => {
  //   var delimiter = "."
  //   if (params[0] && params[0].is("String")) delimiter = params[0].value
  //   else if (params.length) error("Delimiter for [Object].typeInheritance must be a string or blank.", false, true)
  //
  //   if (!("parent" in th)) return new builtIns.String(th.name.toLowerCase())
  //
  //   return new builtIns.String(th.parent.func("typeInheritance", [delimiter]).value + delimiter + th.name.toLowerCase())
  // })
  fn("Object", "properties", 0, th => new builtIns.Array(Object.keys(th.data).map(x => new builtIns.String(x))), {getter : true})
  // fields.Object.properties = new builtIns.Function([], th => new builtIns.Array(Object.keys(th.data).map(x => new builtIns.String(x))))
  fn("Object", "propertyValues", 0, th => new builtIns.Array(Object.values(th.data).map(x => x.value)), {getter : true})
  // fields.Object.propertyValues = new builtIns.Function([], th => new builtIns.Array(Object.values(th.data)))
  fn("Object", "getPropertyData", 1, (th, params) => {
    if (!params[0].is("String")) error("Property name for [Object].getPropertyData must be a string.", false, true)

    if (!th.valueExists(params[0].value)) return new builtIns.Null()

    var data = th.getPropertyData(params[0].value),
        hash = {
          value : data.value,
          isGetter : new builtIns.Boolean(data.getter),
          isSetter : new builtIns.Boolean(data.setter),
          writable : new builtIns.Boolean(data.writable),
          changeable : new builtIns.Boolean(data.changeable)
          // private : new builtIns.Boolean(data.private)
        }

    // if (data.getter) hash.removeGetter = new builtIns.Function([], () => {})

    return new builtIns.Hash(hash)
  })
  fn("Object", "removeGetter", 1, (th, params) => {
    if (!params[0].is("String")) error("Getter name for [Object].removeGetter must be a string.", false, true)

    th.deleteValue(params[0].value, true)
  })
  fn("Object", "replaceGetter", 1, (th, params) => {
    if (!params[0].is("String")) error("Getter name for [Object].removeGetter must be a string.", false, true)

    var name = params[0].value,
        instanceWithValue = th.findParentWithValue(name)

    if (instanceWithValue === null) error(`Getter '${name}' for [Object].replaceGetter does not exist.`)

    var getterValue = instanceWithValue.getValue(name)

    instanceWithValue.deleteValue(name)
    instanceWithValue.setThisValue(name, getterValue)

    return getterValue
  })

  // fn("Hash", "toString", 0, (th, params) => {
  //   if (params[0] && !(params[0].is("String"))) error("First parameter for [Hash].toString must be a string or blank.", false, true)
  //
  //   if (params[1] && !(params[1].is("String"))) error("Second parameter for [Hash].toString must be a string or blank.", false, true)
  //
  //   var str = "", colon = params[0]?.value ?? ": ", comma = params[1]?.value ?? ", "
  //
  //   var keys = Object.keys(th.value)
  //   for (let i in keys) {
  //     str += keys[i] + colon + th.value[keys[i]].func("toString").value
  //     if (i < keys.length - 1) str += comma
  //   }
  //   return new builtIns.String(`{${str}}`)
  //
  // })
  // fields.Hash.toString = new builtIns.Function([], (th, params) => {
  //   if (params[0] && !(params[0].is("String"))) error("First parameter for [Hash].toString must be a string or blank.", false, true)
  //
  //   if (params[1] && !(params[1].is("String"))) error("Second parameter for [Hash].toString must be a string or blank.", false, true)
  //
  //   var str = "", colon = params[0]?.value ?? ": ", comma = params[1]?.value ?? ", "
  //
  //   var keys = Object.keys(th.value)
  //   for (let i in keys) {
  //     str += keys[i] + colon + th.value[keys[i]].func("toString").value
  //     if (i < keys.length - 1) str += comma
  //   }
  //
  //   return new builtIns.String(`{${str}}`)
  // })
  fn("Hash", "keys", 0, th => new builtIns.Array(Object.keys(th.value).map(x => new builtIns.String(x))), {getter : true})
  // fields.Hash.keys = new builtIns.Function([], th => new builtIns.Array(Object.keys(th.value).map(x => new builtIns.String(x))))
  fn("Hash", "values", 0, th => new builtIns.Array(Object.values(th.value)), {getter : true})
  // fields.Hash.values = new builtIns.Function([], th => new builtIns.Array(Object.values(th.value)))
  fn("Hash", "length", 0, th => new builtIns.Number(Object.keys(th.value).length), {getter : true})
  // fields.Hash.length = new builtIns.Function([], th => new builtIns.Number(Object.keys(th.value).length))
  fn("Hash", "getValue", 1, (th, params) => th._get(params[0]))
  // fields.Hash.getValue = new builtIns.Function([null], (th, params) => th._get(params[0]))

  fn("Array", "toString", 0, (th, params) => {
    var delimiter = ", "
    if (params.length)
      if (params[0].is("String")) delimiter = params[0].value
      else error("Delimiter for [Array].toString must be a string or blank.")

    return new builtIns.String(`[${th.value.map(x => x.func("toString").value).join(delimiter)}]`)
  })
  // fields.Array.toString = new builtIns.Function([], (th, params) => {
  //   var delimiter = ", "
  //   if (params.length)
  //     if (params[0].is("String")) delimiter = params[0].value
  //     else error("Delimiter for [Array].toString must be a string or blank.")
  //
  //   return new builtIns.String(`[${th.value.map(x => x.func("toString").value).join(delimiter)}]`)
  // })
  fn("Array", "length", 0, th => new builtIns.Number(th.value.length), {getter : true})
  // fields.Array.length = new builtIns.Function([], th => new builtIns.Number(th.value.length))
  fn("Array", "push", 1, (th, params) => {
    th.value.push(...params)
  })
  fn("Array", "pop", 0, (th, params) => {
    if (params.length) {
      var val = params[0]?.value, resultArr = new builtIns.Array()

      if (val === undefined || !Number.isInteger(val) || val < 0)
        error("Amount of items to pop from array must be a positive integer or blank.")

      for (let i = 0; i < val; i++)
        resultArr.value.push(th.value.pop() || new builtIns.Null())

      return resultArr
    }

    return th.value.pop() || new builtIns.Null()
  })
  fn("Array", "reverse", 0, th => new builtIns.Array(th.value.slice().reverse()))
  // fields.Array.reverse = new builtIns.Function([], th => new builtIns.Array(th.value.reverse()))
  fn("Array", "each", 1, (th, params) => {
    if (!params[0].is("Function")) error("Callback for [Array].each must be a function.", false, true)

    for (let i of th.value) params[0].call(new builtIns.Null(), [i])
  })
  // fields.Array.each = new builtIns.Function([null], (th, params) => {
  //   if (!params[0].is("Function")) error("Callback for [Array].each must be a function.", false, true)
  //
  //   for (let i of th.value) params[0].call(new builtIns.Null(), [i])
  // })
  fn("Array", "map", 1, (th, params) => {
    if (!params[0].is("Function")) error("Callback for [Array].map must be a function.", false, true)

    return new builtIns.Array(th.value.map(x => params[0].call(new builtIns.Null(), [x])))
  })
  // fields.Array.map = new builtIns.Function([null], (th, params) => {
  //   if (!params[0].is("Function")) error("Callback for [Array].map must be a function.", false, true)
  //
  //   return new builtIns.Array(th.value.map(x => params[0].call(new builtIns.Null(), [x])))
  // })

  // fields.Array.TEMP_SET = new builtIns.Function([null], (th, params) => {
  //   th._value[params[0].value] = params[1]
  //
  //   return params[1]
  // })

  fn("String", "toString", 0, th => th)
  // fields.String.toString = new builtIns.Function([], th => th)
  fn("String", "length", 0, th => new builtIns.Number(th.value.length), {getter : true})
  // fields.String.length = new builtIns.Function([], th => new builtIns.Number(th.value.length))
  fn("String", "toBoolean", 0, th => new builtIns.Boolean(th.value.length))
  // fields.String.toBoolean = new builtIns.Function([], th => new builtIns.Boolean(th.value.length))
  fn("String", "spread", 0, th => new builtIns.Array([...th.value]))
  // fields.String.spread = new builtIns.Function([], th => new builtIns.Array([...th.value]))
  fn("String", "reverse", 0, th => new builtIns.String([...th.value].reverse().join("")))
  // fields.String.reverse = new builtIns.Function([], th => new builtIns.String([...th.value].reverse().join("")))
  fn("String", "slice", 0, (th, params) => {
    var start = 0, end = this.value.length

    if (params[0]) {
      if (!params[0].is("Number") || !Number.isInteger(params[0].value))
        error("Unexpected value for [String].slice, expected an integer.", false, true)

      start = params[0].value
    }
    if (params[1]) {
      if (!params[1].is("Number") || !Number.isInteger(params[1].value))
        error("Unexpected value for [String].slice, expected an integer.", false, true)

      end = params[1].value
    }

    return new builtIns.String(th.value.slice(start, end))
  })
  // fields.String.slice = new builtIns.Function([], (th, params) => {
  //   var start = 0, end = this.value.length
  //
  //   if (params[0]) {
  //     if (!params[0].is("Number") || !Number.isInteger(params[0].value))
  //       error("Unexpected value for [String].slice, expected an integer.", false, true)
  //
  //     start = params[0].value
  //   }
  //   if (params[1]) {
  //     if (!params[1].is("Number") || !Number.isInteger(params[1].value))
  //       error("Unexpected value for [String].slice, expected an integer.", false, true)
  //
  //     end = params[1].value
  //   }
  //
  //   return new builtIns.String(th.value.slice(start, end))
  // })

  fn("Number", "isInt", 0, th => new builtIns.Boolean(Number.isInteger(th.value)), {getter : true})
  // fields.Number.isInt = new builtIns.Function([], th => new builtIns.Boolean(Number.isInteger(th.value)))
  fn("Number", "toString", 0, th => new builtIns.String(th.value))
  // fields.Number.toString = new builtIns.Function([], th => new builtIns.String(th.value))
  fn("Number", "toBoolean", 0, th => new builtIns.Boolean(th.value))
  // fields.Number.toBoolean = new builtIns.Function([], th => new builtIns.Boolean(th.value))

  fn("Boolean", "toString", 0, th => new builtIns.String(th.value))
  // fields.Boolean.toString = new builtIns.Function([], th => new builtIns.String(th.value))
  fn("Boolean", "toBoolean", 0, th => th)
  // fields.Boolean.toBoolean = new builtIns.Function([], th => th)

  fn("Null", "toString", 0, () => new builtIns.String("null"))
  // fields.Null.toString = new builtIns.Function([], () => new builtIns.String("null"))
  fn("Null", "toBoolean", 0, () => new builtIns.Boolean(false))
  // fields.Null.toBoolean = new builtIns.Function([], () => new builtIns.Boolean(false))

  fn("Function", "toString", 0, th => new builtIns.String(`function [${th.body instanceof Function ? "internal code" : "body"}]`))
  // fields.Function.toString = new builtIns.Function([], th => new builtIns.String(`function [${th.body instanceof Function ? "internal code" : "body"}]`))

  fn("Class", "new", 0, (th, args) => th.new(args))

  env.Object = new builtIns.Function([], () => {
    return new builtIns.Object()
  })
  env.Hash = new builtIns.Function([], (_, params) => {
    if (params.length) {
      if (!params[0].is("Hash")) error("Parameter for Hash must be a hash or blank.", false, true)

      return new builtIns.Hash(params[0].value)
    } else return new builtIns.Hash()
  })
  env.Array = new builtIns.Function([], (_, params) => {
    if (params.length) {
      if (!params[0].is("Array")) error("Parameter for Array must be an array or blank.", false, true)

      return new builtIns.Array(params[0].value)
    } else return new builtIns.Array()
  })
  env.String = new builtIns.Function([], (_, params) => new builtIns.String(params.length ? params[0].func("toString").value : ""))
  env.Number = new builtIns.Function([], (_, params) => new builtIns.Number(params.length ? params[0].value : 0))
  env.Boolean = new builtIns.Function([], (_, params) => new builtIns.Boolean(params.length && params[0].func("toBoolean").value))
  env.Null = new builtIns.Function([], () => new builtIns.Null())

  env.getVar = new builtIns.Function([null], (th, params) => {
    if (!params.length || !(params[0].is("String"))) error("Namespace name for getVar must be a string.", false, true)

    var environment = exec.currentEnv

    if (!environment.valueExists(params[0].value)) {
      if (params[1] && params[1].func("toBoolean").value) error("Namespace for getVar does not exist.", false, true)
      else return new builtIns.Null()
    }

    return environment.getValue(params[0].value)
  })

  env.print = new builtIns.Function([null], (_, params) => {
    for (let i of params) log(i.func("toString").value)
  })
  env.formatPrint = new builtIns.Function([null], (_, params) => {
    for (let i of params) log(formatMessage(i))
  })

  // __DEBUG
  var debugObj = env.__debug = new builtIns.Object()

  debugObj.setThisValue("print", new builtIns.Function([null], (_, params) => {
    if (typeof console?.log !== "function") error("Could not locate a console for __debug.print.")

    for (let i of params) console.log(i.func("toString").value)
  }))
  debugObj.setThisValue("log", new builtIns.Function([null], (_, params) => {
    if (typeof console?.log !== "function") error("Could not locate a console for __debug.log.")

    for (let i of params) console.log(i)
  }))
  debugObj.setThisValue("intoVar", new builtIns.Function([null, null], (_, params) => {
    if (typeof console?.log !== "function") error("Could not locate a console for __debug.log.")

    if (!params[0].is("String")) error("Variable name for __debug.intoVar must be a string.")

    window[params[0].value] = params[1]
  }))

  debugObj.setThisValue("logEnv", new builtIns.Function([], () => {
    if (typeof console?.log !== "function") error("Could not locate a console for __debug.logEnv.")

    console.log(exec.currentEnv)
  }))
  debugObj.setThisValue("logGlobalEnv", new builtIns.Function([], () => {
    if (typeof console?.log !== "function") error("Could not locate a console for __debug.logGlobalEnv.")

    console.log(exec.globalEnv)
  }))

  // MATH
  var mathObj = env.math = new builtIns.Object()

  mathObj.setThisValue("random", new builtIns.Function([], (_, params) => {
    var min = 0, max = 1

    if (params[0]) {
      if (!params[0].is("Number")) error("Unexpected parameter type for math.random, expected a number.", false, true)

      if (params[1]) min = params[0].value
      else max = params[0].value
    }
    if (params[1]) {
      if (!params[1].is("Number")) error("Unexpected parameter type for math.random, expected a number.", false, true)

      max = params[1].value
    }

    if (max < min) [min, max] = [max, min]

    return Math.random() * (max - min) + min
  }))

  mathObj.setThisValue("randInt", new builtIns.Function([], (_, params) => {
    var min = 0, max = 1

    if (params[0]) {
      if (!params[0].is("Number") || !Number.isInteger(params[0].value))
        error("Unexpected parameter type for math.random, expected an integer.", false, true)

      if (params[1]) min = params[0].value
      else max = params[0].value
    }
    if (params[1]) {
      if (!params[1].is("Number") || !Number.isInteger(params[1].value))
        error("Unexpected parameter type for math.random, expected an integer.", false, true)

      max = params[1].value
    }

    if (max < min) [min, max] = [max, min]

    return Math.floor(Math.random() * (max - min)) + min
  }))

  mathObj.setThisValue("randBool", new builtIns.Function([], (_, params) => {
    if (params[0] && !params[0].is("Number")) error("Chance for math.randBool must be a number or blank (default 0.5).", false, true)

    return new builtIns.Boolean(Math.random() < (params[0]?.value ?? 0.5))
  }))

  // TIME
  var timeObj = env.time = new builtIns.Object(),
      dayNames = {
        full : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        medium : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        short : ["Su", "M", "Tu", "W", "Th", "F", "Sa"],
        single : ["S", "M", "T", "W", "T", "F", "S"],
        singleUnique : ["U", "M", "T", "W", "H", "F", "S"]
      },
      monthNames = {
        full : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        short : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        // short : ["Ja", "F", "Mr", "Ap", "My", "Jn", "Jl", "Au", "S", "O", "N", "D"],
        single : ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
      }

  timeObj.setThisValue("milliseconds", new builtIns.Function([], () => new builtIns.Number(new Date().getMilliseconds())))
  timeObj.setThisValue("seconds", new builtIns.Function([], () => new builtIns.Number(new Date().getSeconds())))
  timeObj.setThisValue("minutes", new builtIns.Function([], () => new builtIns.Number(new Date().getMinutes())))
  timeObj.setThisValue("hours", new builtIns.Function([], () => new builtIns.Number(new Date().getHours())))
  timeObj.setThisValue("day", new builtIns.Function([], () => new builtIns.Number(new Date().getDay())))
  timeObj.setThisValue("month", new builtIns.Function([], () => new builtIns.Number(new Date().getMonth())))
  timeObj.setThisValue("year", new builtIns.Function([], () => new builtIns.Number(new Date().getFullYear())))
  timeObj.setThisValue("shortYear", new builtIns.Function([], () => new builtIns.Number(new Date().getFullYear() % 100)))

  timeObj.setThisValue("UTCMilliseconds", new builtIns.Function([], () => new builtIns.Number(new Date().getUTCMilliseconds())))
  timeObj.setThisValue("UTCSeconds", new builtIns.Function([], () => new builtIns.Number(new Date().getUTCSeconds())))
  timeObj.setThisValue("UTCMinutes", new builtIns.Function([], () => new builtIns.Number(new Date().getUTCMinutes())))
  timeObj.setThisValue("UTCHours", new builtIns.Function([], () => new builtIns.Number(new Date().getUTCHours())))
  timeObj.setThisValue("UTCDay", new builtIns.Function([], () => new builtIns.Number(new Date().getUTCDay())))
  timeObj.setThisValue("UTCMonth", new builtIns.Function([], () => new builtIns.Number(new Date().getUTCMonth())))
  timeObj.setThisValue("UTCYear", new builtIns.Function([], () => new builtIns.Number(new Date().getUTCFullYear())))
  timeObj.setThisValue("UTCShortYear", new builtIns.Function([], () => new builtIns.Number(new Date().getUTCFullYear() % 100)))

  timeObj.setThisValue("dayName", new builtIns.Function([], (_, params) => {
    var days = dayNames.full

    if (params[0]) {
      if (params[0].is("String")) {
        if (params[0].value in dayNames)
          days = dayNames[params[0].value]
        else
          error("Invalid day name string, expected one of: 'full', 'medium', 'short', 'single', 'singleUnique'.", false, true)
      } else if (params[0].is("Array")) {
        if (params[0].value.length < 7)
          error("Not enough day names in array, expected seven.", false, true)

        days = params[0].value.map(x => x.func("toString").value)
      } else
        error("Invalid parameter type for time.dayName.", false, true)
    }

    return new builtIns.String(days[new Date().getDay()])
  }))

  timeObj.setThisValue("monthName", new builtIns.Function([], (_, params) => {
    var months = monthNames.full

    if (params[0]) {
      if (params[0].is("String")) {
        if (params[0].value in monthNames)
          months = monthNames[params[0].value]
        else
          error("Invalid month name string, expected one of: 'full', 'short', 'single'.", false, true)
      } else if (params[0].is("Array")) {
        if (params[0].value.length < 12)
          error("Not enough month names in array, expected twelve.", false, true)

        months = params[0].value.map(x => x.func("toString").value)
      } else
        error("Invalid parameter type for time.monthName.", false, true)
    }

    return new builtIns.String(months[new Date().getMonth()])
  }))

  timeObj.setThisValue("now", new builtIns.Function([], () => new builtIns.Number(Date.now())))
  timeObj.setThisValue("totalSeconds", new builtIns.Function([], () => new builtIns.Number(Math.trunc(Date.now() / 1000))))
  timeObj.setThisValue("totalMinutes", new builtIns.Function([], () => new builtIns.Number(Math.trunc(Date.now() / 60_000))))
  timeObj.setThisValue("totalHours", new builtIns.Function([], () => new builtIns.Number(Math.trunc(Date.now() / 3_600_000))))
  timeObj.setThisValue("totalDays", new builtIns.Function([], () => new builtIns.Number(Math.trunc(Date.now() / 86_400_000))))

  timeObj.setThisValue("trueTotalSeconds", new builtIns.Function([], () => new builtIns.Number(Date.now() / 1000)))
  timeObj.setThisValue("trueTotalMinutes", new builtIns.Function([], () => new builtIns.Number(Date.now() / 60_000)))
  timeObj.setThisValue("trueTotalHours", new builtIns.Function([], () => new builtIns.Number(Date.now() / 3_600_000)))
  timeObj.setThisValue("trueTotalDays", new builtIns.Function([], () => new builtIns.Number(Date.now() / 86_400_000)))

  return builtIns
}
