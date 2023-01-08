const tests = {
  "=" : {
    test : "x = 2\nx = 5\nreturn x",
    value : 5
  },
  "+" : {
    test : "return 2 + 7",
    value : 9
  },
  "+=" : {
    test : "x = 2\nx += 5\nreturn x",
    value : 7
  },
  // ++
  // ++
  "-" : {
    test : "return 2 - 7",
    value : -5
  },
  "-=" : {
    test : "x = 2\nx -= 5\nreturn x",
    value : -3
  },
  // --
  // --
  "*" : {
    test : "return 2 * 7",
    value : 14
  },
  "*=" : {
    test : "x = 2\nx *= 5\nreturn x",
    value : 10
  },
  "/" : {
    test : `return 2 / 4`,
    value : 0.5
  },
  "/=" : {
    test : "x = 2\nx /= 5\nreturn x",
    value : 0.4
  },
  // %
  // %=
  "**" : {
    test : "return 2 ** 7",
    value : 128
  },
  "**=" : {
    test : "x = 2\nx **= 5\nreturn x",
    value : 32
  },
  "&&" : {
    test : "return [false && 0, 1 && false, false && 1, 1 && true]",
    string : "[false, false, false, true]"
  },
  "&&=" : {
    test : "x = 12\ny = 0\nx &&= 4\ny &&= 10\nreturn [x, y]",
    string : "[4, 0]"
  },
  "||" : {
    test : "return [false || 0, 1 || false, false || 1, 1 || true]",
    string : "[0, 1, 1, 1]"
  },
  "||=" : {
    test : "x = 12\ny = 0\nx ||= 4\ny ||= 10\nreturn [x, y]",
    string : "[12, 10]"
  },
  // ^^
  // ^^=
  // ??
  // ??=
  // ^
  // ^=
  // &
  // &=
  // |
  // |=
  // ~
  ".." : {
    test : "return 1 .. 'a' .. [2, 3]",
    value : "1a[2, 3]"
  },
  "..=" : {
    test : "x = 3\nx ..= '45'\nreturn x",
    value : "345"
  },
  "." : {
    test : "return true.toString()",
    value : "true"
  },
  // ==
  // !=
  // ~=
  // >
  // >=
  // <
  // <=
  // !
  // ? :
  number :  {
    test : "return 12345",
    value : 12345
  },
  numberNegative :  {
    test : "return -12345",
    value : -12345
  },
  numberDecimals :  {
    test : "return [000.000123, .123, 123.00, 123000.]",
    string : "[0.000123, 0.123, 123, 123000]"
  },
  numberScientificNotation :  {
    test : "return [0.5e10, -4.5e+3]",
    string : "[5000000000, -4500]"
  },
  stringDouble : {
    test : "return \"test\"",
    value : "test"
  },
  stringSingle : {
    test : "return 'test'",
    value : "test"
  },
  unterminatedString : {
    test : "'test test test",
    error : "Unterminated string \"test test test\"."
  },
  unterminatedStringNewLine : {
    test : "'test test test\ntest test'",
    error : "Unterminated string \"test test test\"."
  },
  stringNewLine : {
    test : "'test test test\\ntest test'",
    value : "test test test\ntest test"
  },
  array : {
    test : "return [1, 2, 3]",
    string : "[1, 2, 3]"
  },
  arrayNoCommas : {
    test : "return [1 2 3]",
    string : "[1, 2, 3]"
  },
  arrayNewLines : {
    test : "return [\n  1,\n  2,\n  3\n]",
    string : "[1, 2, 3]"
  },
  arrayTrailingComma : {
    test : "return [1, 2, 3,]",
    string : "[1, 2, 3]"
  },
  arrayDoubleComma : {
    test : "return [1, 2, , 3]",
    error : "Unexpected ','."
  },
  emptyArray : {
    test : "return []",
    string : "[]"
  },
  hash : {
    test : "return {a : 1, b : 2, c : 3}",
    string : "{a: 1, b: 2, c: 3}"
  },
  hashNoColons : {
    test : "return {a 1, b 2, c 3}",
    string : "{a: 1, b: 2, c: 3}"
  },
  hashNewLines : {
    test : "return {\n  a : 1,\n  b : 2,\n  c : 3\n}",
    string : "{a: 1, b: 2, c: 3}"
  },
  hashTrailingComma : {
    test : "return {a : 1, b : 2, c : 3,}",
    string : "{a: 1, b: 2, c: 3}"
  },
  emptyHash : {
    test : "return {}",
    string : "{}"
  },
  closure : {
    test : "x = 5\nfunction createVar:\n  y = 3\ncreateVar()\nreturn [x, y]",
    error : "Namespace y does not exist."
  },
  functionsWithSameArgumentName : {
    test : `a = null
b = null
c = null

function testA arg
  a = arg
  testB(arg - 5)
  c = arg
end

function testB arg:
  b = arg

testA(5)
return [a, b, c]`,
    string : "[5, 0, 5]"
  },
  nonWritablePropertyAssignment : {
    test : "{}.toString = 123",
    error : "Cannot assign to non-writable property 'toString'."
  },
  arrayPush : {
    test : "arr = [1, 2]\narr.push(3)\nreturn arr",
    string : "[1, 2, 3]"
  },
  arrayPushMultiple : {
    test : "arr = [1, 2]\narr.push(3, 4, 5)\nreturn arr",
    string : "[1, 2, 3, 4, 5]"
  },
  emptyArrayPush : {
    test : "arr = []\narr.push(98765)\nreturn arr",
    string : "[98765]"
  },
  arrayPushReturnNull : {
    test : "arr = []\nreturn arr.push(123)",
    value : null
  },
  arrayPop : {
    test : "return [1, 2, 3].pop()",
    value : 3
  },
  arrayPopMultiple : {
    test : "return [1, 2, 3, 4].pop(6)",
    string : "[4, 3, 2, 1, null, null]"
  },
  emptyArrayPop : {
    test : "return [].pop()",
    value : null
  },
  arrayPopNone : {
    test : "return [1, 2, 3].pop(0)",
    string : "[]"
  }
}

function execTest(name, test) {
  var exec = new Executor({declarations : [], statements : []}), error

  exec.GO()

  try {
    var result = exec.execBlock(
      new Parser(
        new Tokenizer(new Characterizer(test.test))
      ).GO(),
      true
    )
  } catch (e) {
    console.error(e)

    error = e
  }

  var target, value, testType
  if ("value" in test) {
    target = test.value
    value = result?.value

    testType = "v"
  } else if (test.error) {
    target = test.error
    value = error.replace(/ERROR: (line \d+ column \d+: )?/, "")

    testType = "e"
  } else {
    target = test.string
    value = result?.func("toString").value

    testType = "s"
  }

  var success = target === value

  consoleMsg(
    `<div class = "test${success}">${Object.keys(tests).indexOf(name)}. <b style = "color: inherit;">${name.replaceAll(/([a-z])([A-Z])/g, "$1 $2").toUpperCase()}</b></div>` +
    `<div>CODE (${testType}): <i style = "opacity: 0.7;">${test.test.replaceAll("\n", "\n          ")}</i></div>` +
    `<div>EXPECTED: ${formatMessage(target)}</div>` +
    (error && !test.error ? `<div class = "testfalse">${error}</div>` : `<div>  RESULT: ${formatMessage(value)}</div>`)
  )

  // console.table({name, succeeded : target === value, target, value})
  console.log(`%c${name.replaceAll(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()}%c\nEXPECTED: ${target}\nRESULT: ${value}`, `font-weight: bold; color: ${success ? "lawngreen" : "tomato"};`, "font-weight: unset; color: unset;")
}

for (let i of Object.entries(tests))
  execTest(...i)
