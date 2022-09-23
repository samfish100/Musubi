/*

TEMPLATE:

,
  testName : {
    input : "",
    expected : "",
    run : input => {

    }
  }

*/

var TESTRESULTS = {};
(() => {
  const basicParserTest = input => {
    var parser = new Parser(new Tokenizer(new Characterizer(input)))

    return parser.GO()
  },
  basicExecTest = input => {
    var parser = new Parser(new Tokenizer(new Characterizer(input))),
        executor = new Executor(parser.GO())

    executor.GO()

    return executor
  }

  const tests = {
    characterizerGeneral : {
      input : "(**) == = a.\"'b'\".c.'\"d\"'{[]}",
      expected : [
        "(", "*", "*", ")", " ",
        "=", "=", " ", "=", " ",
        "a", ".", "\"", "'", "b",
        "'", "\"", ".", "c", ".",
        "'", "\"", "d", "\"", "'",
        "{", "[", "]", "}"
      ],
      run : input => {
        var characterizer = new Characterizer(input), output = []

        while (!characterizer.eof()) output.push(characterizer.next())

        return output
      }
    },
    characterizerEof : {
      input : "x",
      expected : [false, true],
      run : input => {
        var characterizer = new Characterizer(input), output = [characterizer.eof()]

        characterizer.next()

        output.push(characterizer.eof())

        return output
      }
    },
    tokenizerGeneral : {
      input : "(**) == = block.\"'b'\".c.'\"d\"'{[]}",
      expected : [
        "punc", "(", "operator", "**", "punc", ")", "operator", "==",
        "operator", "=", "keyword", "block", "operator", ".", "string", "'b'",
        "operator", ".", "identifier", "c", "operator", ".", "string", "\"d\"",
        "punc", "{", "punc", "[", "punc", "]", "punc", "}"
      ],
      run : input => {
        var tokenizer = new Tokenizer(new Characterizer(input)), output = []

        while (!tokenizer.eof()) {
          var tok = tokenizer.next()

          output.push(tok.type, tok.value)
        }

        return output
      }
    },
    tokenizerEof : {
      input : "xxxx",
      expected : [false, true],
      run : input => {
        var tokenizer = new Tokenizer(new Characterizer(input)), output = [tokenizer.eof()]

        tokenizer.next()

        output.push(tokenizer.eof())

        return output
      }
    },
    singleOperators : {
      input : "+ - * /^ %& | <> . \\ ?! #=",
      expected : [
        "operator", "+", "operator", "-", "operator", "*", "operator", "/",
        "operator", "^", "operator", "%", "operator", "&", "operator", "|",
        "operator", "<", "operator", ">", "operator", ".", "operator", "\\",
        "operator", "?", "operator", "!", "operator", "#", "operator", "="
      ],
      run : input => {
        var tokenizer = new Tokenizer(new Characterizer(input)), output = []

        while (!tokenizer.eof()) {
          var tok = tokenizer.next()

          output.push(tok.type, tok.value)
        }

        return output
      }
    },
    doubleOperators : {
      input : "!= >= <=+= -= *= ** /= ^=%= &= |= == ++-- && ?? ||",
      expected : [
        "operator", "!=", "operator", ">=", "operator", "<=", "operator", "+=",
        "operator", "-=", "operator", "*=", "operator", "**", "operator", "/=",
        "operator", "^=", "operator", "%=", "operator", "&=", "operator", "|=",
        "operator", "==", "operator", "++", "operator", "--", "operator", "&&",
        "operator", "??", "operator", "||"
      ],
      run : input => {
        var tokenizer = new Tokenizer(new Characterizer(input)), output = []

        while (!tokenizer.eof()) {
          var tok = tokenizer.next()

          output.push(tok.type, tok.value)
        }

        return output
      }
    },
    tripleOperators : {
      input : "&&= ||= **= ??=",
      expected : ["operator", "&&=", "operator", "||=", "operator", "**=", "operator", "??="],
      run : input => {
        var tokenizer = new Tokenizer(new Characterizer(input)), output = []

        while (!tokenizer.eof()) {
          var tok = tokenizer.next()

          output.push(tok.type, tok.value)
        }

        return output
      }
    },
    unterminatedString : {
      input : "\"string string blah blah blah",
      expected : ["Unterminated string \"string string blah blah blah\"."],
      allowErrors : true,
      useLogs : true,
      run : basicParserTest
    },
    unterminatedStringSingleQuote : {
      input : "'string string blah blah blah",
      expected : ["Unterminated string \"string string blah blah blah\"."],
      allowErrors : true,
      useLogs : true,
      run : basicParserTest
    },
    unterminatedStringNewLine : {
      input : "\"string string blah\nblah blah\"",
      expected : ["Unterminated string \"string string blah\"."],
      allowErrors : true,
      useLogs : true,
      run : basicParserTest
    },
    reference : {
      input : "identifierrrrrr",
      expected : {
        declarations : [],
        statements : [
          {
            type : "expression",
            value : {
              type : "reference",
              name : "identifierrrrrr",
              params : []
            }
          }
        ]
      },
      run : basicParserTest
    },
    funcCall : {
      input : "calling 'my', \"function\", 1, 2, 3",
      expected : {
        declarations : [],
        statements : [
          {
            type : "expression",
            value : {
              type : "reference",
              name : "calling",
              params : [
                {
                  type : "string",
                  value : "my"
                },
                {
                  type : "string",
                  value : "function"
                },
                {
                  type : "number",
                  value : 1
                },
                {
                  type : "number",
                  value : 2
                },
                {
                  type : "number",
                  value : 3
                }
              ]
            }
          }
        ]
      },
      run : basicParserTest
    },
    funcCallNested : {
      input : "nested 1, func 'aaa', testing 2.3",
      expected : {
        declarations : [],
        statements : [
          {
            type : "expression",
            value : {
              type : "reference",
              name : "nested",
              params : [
                {
                  type : "number",
                  value : 1
                },
                {
                  type : "reference",
                  name : "func",
                  params : [
                    {
                      type : "string",
                      value : "aaa"
                    },
                    {
                      type : "reference",
                      name : "testing",
                      params : [
                        {
                          type : "number",
                          value : 2.3
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          }
        ]
      },
      run : basicParserTest
    },
    funcCallTwoLineParams : {
      input : "myFunc 1, 2\n3, 4",
      expected : {
        type : "expression",
        value : {
          type : "reference",
          name : "myFunc",
          params : [
            {
              type : "number",
              value : 1
            },
            {
              type : "number",
              value : 2
            }
          ]
        }
      },
      run : input => {
        var parser = new Parser(new Tokenizer(new Characterizer(input)))

        return parser.nextStatement(false)
      }
    },
    funcCallTwoLineCommaParams : {
      input : "myFunc 1, 2,\n3, 4",
      expected : {
        declarations : [],
        statements : [
          {
            type : "expression",
            value : {
              type : "reference",
              name : "myFunc",
              params : [
                {
                  type : "number",
                  value : 1
                },
                {
                  type : "number",
                  value : 2
                },
                {
                  type : "number",
                  value : 3
                },
                {
                  type : "number",
                  value : 4
                }
              ]
            }
          }
        ]
      },
      run : basicParserTest
    },
    funcCallParentheses : {
      input : "myFunc(1 2 3 4)",
      expected : {
        declarations : [],
        statements : [
          {
            type : "expression",
            value : {
              type : "reference",
              name : "myFunc",
              params : [
                {
                  type : "number",
                  value : 1
                },
                {
                  type : "number",
                  value : 2
                },
                {
                  type : "number",
                  value : 3
                },
                {
                  type : "number",
                  value : 4
                }
              ]
            }
          }
        ]
      },
      run : basicParserTest
    },
    funcCallNewLineParentheses : {
      input : "myFunc(1 2\n3 4)",
      expected : {
        declarations : [],
        statements : [
          {
            type : "expression",
            value : {
              type : "reference",
              name : "myFunc",
              params : [
                {
                  type : "number",
                  value : 1
                },
                {
                  type : "number",
                  value : 2
                },
                {
                  type : "number",
                  value : 3
                },
                {
                  type : "number",
                  value : 4
                }
              ]
            }
          }
        ]
      },
      run : basicParserTest
    },
    funcCallCommasAndParentheses : {
      input : "myFunc(1 2,\n3, 4)",
      expected : {
        declarations : [],
        statements : [
          {
            type : "expression",
            value : {
              type : "reference",
              name : "myFunc",
              params : [
                {
                  type : "number",
                  value : 1
                },
                {
                  type : "number",
                  value : 2
                },
                {
                  type : "number",
                  value : 3
                },
                {
                  type : "number",
                  value : 4
                }
              ]
            }
          }
        ]
      },
      run : basicParserTest
    },
    globalEnvCreated : {
      input : "",
      expected : [true, undefined],
      run : input => {
        var exec = basicExecTest(input)

        return ["globalEnv" in exec, exec.globalEnv?.parent]
      }
    },
    printFunc : {
      input : "print 'hello world'",
      expected : ["hello world"],
      useLogs : true,
      run : basicExecTest
    },
    nestedPrintFunc : {
      input : "print print 3",
      expected : ["3", "null"],
      useLogs : true,
      run : basicExecTest
    },
    literalCreationFunctions : {
      input : "print Number '3'\nprint String 'hello'\nprint Boolean 'world'\nprint Null",
      expected : ["3", "hello", "true", "null"],
      useLogs : true,
      run : basicExecTest
    },
    booleanConversion : {
      input : "print Boolean 0\nprint Boolean 'hi'\nprint Boolean print Boolean true",
      expected : ["false", "true", "true", "false"],
      useLogs : true,
      run : basicExecTest
    },
    funcDefinition : {
      input : `function test val
  val + 2
end`,
      expected : [],
      useLogs : true,
      run : basicExecTest
    },
    funcDefinitionWithCall : {
      input : `function test val
  val + 2
end

print test 123`,
      expected : [],
      useLogs : true,
      run : basicExecTest
    },
    funcDefinitionWithReturn : {
      input : `function test val
  return val
end`,
      expected : [],
      useLogs : true,
      run : basicExecTest
    },
    funcDefinitionWithCallAndReturn : {
      input : `function test val
  return val
end

print test "hi"`,
      expected : ["hi"],
      useLogs : true,
      run : basicExecTest
    }
  }

  //––––––––––––––––––––––––––––––––//

  const testGroups = {
    CHARACTERIZER : ["characterizerGeneral", "characterizerEof"],
    TOKENIZER : [
      "tokenizerGeneral", "tokenizerEof",
      "singleOperators", "doubleOperators", "tripleOperators",
      "unterminatedString", "unterminatedStringSingleQuote", "unterminatedStringNewLine"
    ],
    PARSER : [
      "reference",
      "funcCall", "funcCallNested", "funcCallTwoLineParams", "funcCallTwoLineCommaParams",
      "funcCallParentheses", "funcCallTwoLineParentheses", "funcCallCommasAndParentheses"
    ],
    EXECUTION : ["globalEnvCreated", "printFunc", "nestedPrintFunc", "literalCreationFunctions"],
    REFERENCE : ["reference", "funcCall", "funcCallNested", "funcCallTwoLineParams", "funcCallTwoLineCommaParams"],
    FUNCTION_CALL : ["funcCall", "funcCallNested", "funcCallTwoLineParams", "funcCallTwoLineCommaParams"],
    OPERATOR_TOKENIZING : ["singleOperators", "doubleOperators", "tripleOperators"],
    UNTERMINATED_STRING : ["unterminatedString", "unterminatedStringSingleQuote", "unterminatedStringNewLine"]
  }

  //––––––––––––––––––––––––––––––––//

  Object.keys(testGroups).forEach(x => { e("testSelect").innerHTML += `<option>${x}</option>` })
  Object.keys(tests).forEach(x => { e("testSelect").innerHTML += `<option>${x}</option>` })

  function runTest(testList) {
    var logFuncBackup = log, returnLogs, errorFuncBackup = error, errors = [], sawError

    log = msg => returnLogs.push(msg)
    error = (msg, isWarn, fromExec) => {
      if (!isWarn) sawError = true

      returnLogs.push(msg)
      errors.push({msg, isWarn, fromExec, line, column})

      errorFuncBackup(msg, isWarn, fromExec)
    }

    var summary = []

    if (testGroups[testList[0]]) testList = testGroups[testList[0]]

    testList.forEach((x, num) => {
      var test = tests[x], result
      sawError = false

      returnLogs = []

      try {
        result = test.run(test.input)
      } catch(err) {
        consoleMsg(err, "error")

        stack = err.stack
        sawError = true
      }
      if (test.useLogs) result = returnLogs

      var succeeded = Boolean((!sawError || test.allowErrors) && testEquality(result, test))

      console.log(`${num}.${x}: %c${succeeded}`, "color: #" + (succeeded ? "4f0" : "f40"), test.input, test.expected, "=>", result)
      consoleMsg(`${num}.${x}: <span class = "test${succeeded}">${succeeded}</span> <b>(</b><span class = "testRes">${format(test.input, true)}</span> <b>=</b> <span class = "testRes">${format(test.expected, true)}</span><b>) =></b> <span class = "testRes">${format(result, true)}</span>`, "log")

      summary.push([x, succeeded])
      TESTRESULTS[x] = {
        num : num,
        input : test.input,
        expected : test.expected,
        result : result,
        succeeded : succeeded,
        logs : returnLogs,
        usedLogs : test.useLogs
      }
    })

    log = logFuncBackup
    error = errorFuncBackup

    console.log("errors: ", errors)

    return summary
  }

  function testEquality(result, test) {
    if (Array.isArray(result) && Array.isArray(test.expected)) {
      var match = result.length === test.expected.length

      for (let i = 0; i < result.length; i++)
        if (!testEquality(result[i], {expected : test.expected[i]})) {
          match = false

          break
        }

      return match
    } else if (typeof result === "object" && typeof test.expected === "object" && result !== null && test.expected !== null) {
      var resultKeys = Object.keys(result), testKeys = Object.keys(test.expected)

      var match = resultKeys.length === testKeys.length

      for (let i = 0; i < resultKeys.length; i++)
        if (resultKeys[i] !== testKeys[i] ||
          !testEquality(result[resultKeys[i]], {expected : test.expected[testKeys[i]]})) {

          match = false

          break
        }

      return match
    } else return result === test.expected
  }

  function format(text, doFormatting) {
    if (typeof text === "string") return `"${doFormatting ? "<u>" : ""}${text}${doFormatting ? "</u>" : ""}"`
    else if (typeof text === "object" && text !== null) {
      if (Array.isArray(text)) {
        if (text.length === 0) return "[]"

        var output = "["

        text.forEach(x => { output += `${format(x, doFormatting)}, ` })

        return output.slice(0, -2) + "]"
      } else {
        var output = "{", keys = Object.keys(text)

        if (keys.length === 0) return "{}"

        keys.forEach(x => { output += `${x} : ${format(text[x], doFormatting)}, ` })

        return output.slice(0, -2) + "}"
      }
    }

    return text
  }

  function runTests() {
    var testsToRun = [e("testSelect").value]

    if (testsToRun[0] === "all tests") testsToRun = Object.keys(tests)

    var summary = runTest(testsToRun), succeeded = true, fail, summaryMsg = "", consoleSummary = {}

    summary.forEach(x => {
      consoleSummary[x[0]] = x[1]
      summaryMsg += `${x[0]}: <span class = "test${x[1]}">${x[1]}</span>; `

      if (!x[1] && succeeded) {
        succeeded = false

        fail = x[0]
      }
    })

    console.log(consoleSummary, `ALL TESTS SUCCEEDED: ${succeeded}${succeeded ? "" : `  (first fail: ${fail})`}`)
    consoleMsg(`<b>Test summary:</b>\n${summaryMsg.slice(0, -2)}\n\n<b>ALL TESTS SUCCEEDED:</b> <span class = "test${succeeded}">${succeeded}</span>${succeeded ? "" : `  (first fail: ${fail})`}`, "log")
  }

  e("runTests").onclick = runTests

  setTimeout(runTests)
})()

/*
[...document.querySelectorAll(
  "*:not(head):not(script):not(link):not(meta):not(html):not(body):not(style):not(title):not(noscript)"
)].forEach(x => {
  x.style.transform = "translateY(100px)"
  x.style.opacity = "0"
  void x.offsetWidth
  x.style.transition = "transform 1s ease-out, opacity 1s ease-out"
  setTimeout(() => {
    x.style.transform = "translateY(0)"
    x.style.opacity = "1"
  }, Math.random() * 2000)
})
*/
