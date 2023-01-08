function e(elem) { return document.getElementById(elem) }
function code() { return document.getElementById("input").value }

//––––––––––––––––––––––––––––––––//

const versionNumber = "0.6.1",
      versionText = "getters and setters"

//––––––––––––––––––––––––––––––––//

e("versionNumber").innerText = versionNumber
e("versionInfo").innerText = versionText

e("input").focus()

if (localStorage.getItem("currentCode")) {
  e("input").value = localStorage.getItem("currentCode")

  updateLineNums()

  e("input").style.height = ((code().match(/\n/g) || []).length + 1) * 19 + 100 + "px"
}

e("input").oninput = x => {
  setTimeout(() => { localStorage.setItem("currentCode", code()) })

  updateLineNums()

  e("input").style.height = (((code().match(/\n/g) || []).length + 1) * 19 + 100) + "px"

  var cursorStart = e("input").selectionStart,
      cursorPos = e("input").selectionEnd
  
  if (cursorStart === cursorPos) {
    var key = x.data, output
    
    if (key === "(") output = ")"
    else if (key === "[") output = "]"
    else if (key === "{") output = "}"
    else if (key === "\"") output = "\""
    else if (key === "'") output = "'"
    else if (key === "`") output = "`"
    else return

    e("input").value = code().slice(0, cursorPos) + output + code().slice(cursorPos)
    
    e("input").selectionEnd = cursorPos
  }
}

e("input").onkeydown = x => {
  if (x.key === "Enter")
    e("input").style.height = (((code().match(/\n/g) || []).length + 2) * 19 + 100) + "px"

  var cursorStart = e("input").selectionStart,
      cursorPos = e("input").selectionEnd,
      key = x.key,
      output

  if (cursorStart !== cursorPos) {
    if (key === "Tab") {
      console.log("u pressed the tabby tabber key")
      
      x.preventDefault()
    }
    
    if (key === "(") output = ["(", ")"]
    else if (key === "[") output = ["[", "]"]
    else if (key === "{") output = ["{", "}"]
    else if (key === "\"") output = ["\"", "\""]
    else if (key === "'") output = ["'", "'"]
    else if (key === "`") output = ["`", "`"]
    else return
    
    e("input").value = code().slice(0, cursorStart) +
      output[0] + code().slice(cursorStart, cursorPos) + output[1] + code().slice(cursorPos)
    
    e("input").selectionStart = cursorStart + 1
    e("input").selectionEnd = cursorPos + 1
    
    x.preventDefault()
  } else {
    var leftKey = code().charAt(cursorPos - 1),
        rightKey = code().charAt(cursorPos)
    if (key === "Enter") {
      if (code().length && "{[".includes(leftKey)) {
        var afterCursor = code().slice(cursorPos)
        
        e("input").value = code().slice(0, cursorPos)
        
        newLine(cursorPos)

        cursorPos = e("input").selectionEnd
        
        if ((leftKey === "[" && rightKey === "]") || (leftKey === "{" && rightKey === "}")) newLine(cursorPos, true)
        e("input").value += afterCursor

        e("input").selectionEnd = cursorPos
      } else newLine(cursorPos)
      
      updateLineNums()
      
      x.preventDefault()
    } else if (key === "Backspace") {
      if ((leftKey === "(" && rightKey === ")") ||
        (leftKey === "[" && rightKey === "]") ||
        (leftKey === "{" && rightKey === "}") ||
        (leftKey === "\"" && rightKey === "\"") ||
        (leftKey === "'" && rightKey === "'") ||
        (leftKey === "`" && rightKey === "`")) {

        e("input").value = code().slice(0, cursorPos - 1) + code().slice(cursorPos + 1)
        
        e("input").selectionEnd = cursorPos - 1
        
        if (!x.metaKey) x.preventDefault()
      }
    } else if (key === "Tab") {
      e("input").value = code().slice(0, cursorPos) + "  " + code().slice(cursorPos)

      e("input").selectionEnd = cursorPos + 2
      
      x.preventDefault()
    }

    if (")]}\"'`".includes(key) && code().charAt(cursorPos) === key) {
      e("input").selectionStart = cursorPos + 1
      e("input").selectionEnd = cursorPos + 1

      x.preventDefault()
    }
  }
}

function newLine(cursorPos, deIndent = false) {
  var beforeCursor = code().slice(0, cursorPos),
      afterCursor = code().slice(cursorPos),
      currentLine = beforeCursor ? beforeCursor.split("\n").pop().trim() : ""

  var doKeywordIndent = (/^(if|elif|else|or|for|while|repeat|function|loop|class)\b([^:]*|\s*:)$/.test(currentLine) &&
      !currentLine.endsWith(";") && !currentLine.endsWith("end")) ||
      /\b(block)((\s+[\w\s,]+)|(\([\w\s,]+\)))?$/.test(currentLine)

  var openSquare = currentLine.match(/\[/g)?.length || 0 - currentLine.match(/]/g)?.length || 0,
      openCurly = currentLine.match(/{/g)?.length || 0 - currentLine.match(/}/g)?.length || 0,
      indent = 0

  if (beforeCursor && ("{[&|*^=".includes(beforeCursor.slice(-1)) || doKeywordIndent)) indent = 2
  if (deIndent || (openSquare === 0 && afterCursor.startsWith("]"))
    || (openCurly === 0 && afterCursor.startsWith("}")) ||
    afterCursor.startsWith("end") || afterCursor.startsWith(";")) indent = -2
  
  var prevIndent = Math.floor(beforeCursor.split("\n").pop().search(/\S|$/)), indents = ""
  for (let i = 0; i < prevIndent + indent; i++) indents += " "

  e("input").value = beforeCursor + "\n" + indents + (deIndent === "end" ? "end" : "") + afterCursor

  cursorPos = cursorPos + 1 + Math.max(0, prevIndent + indent)

  if (doKeywordIndent && !currentLine.endsWith(":")) newLine(cursorPos, "end")

  e("input").selectionEnd = cursorPos
  e("input").selectionStart = cursorPos
}

function updateLineNums() {
  var lines = code().split("\n").length
  
  e("lineNums").innerHTML = ""
  for (let i = 0; i < lines; i++) e("lineNums").innerHTML += (i + 1) + "<br/>"

  e("lineNumsBackground").style.width = e("lineNums").offsetWidth + "px"
}

var consoleOutput = e("consoleOutput")
e("consoleInput").onfocus = () => {
  var scrollPos = consoleOutput.scrollTop,
      scrollOffset = Math.min(250, consoleOutput.scrollHeight - consoleOutput.scrollTop)
  // e("consoleWrapper").style.height = "300px"
  setTimeout(() => { consoleOutput.scrollTop = scrollPos - scrollOffset }, 200)
}
e("consoleInput").onblur = () => {
  var scrollPos = consoleOutput.scrollTop
  // e("consoleWrapper").style.height = "120px"
  setTimeout(() => { consoleOutput.scrollTop = scrollPos + 250 }, 200)
}

e("consoleInput").onkeydown = event => {
  if (event.code === "Enter") {
    consoleMsg(e("consoleInput").value.trim(), "input")

    // parseCommand(e("consoleInput").value.trim().replace(/\s{2,}/g, " "))
    runCommand(e("consoleInput").value)

    e("consoleInput").value = ""
  }
}

function tryCode(func) {
  try {
    func()
  } catch (err) {
    consoleMsg(err, "error")

    if (err instanceof Error) problem(err.message, err.stack)

    stack = err.stack
  }
}

function runCommand(command) {
  var code

  tryCode(() => {
    code = new Parser(
      new Tokenizer(
        new Characterizer(command)
      )
    ).GO()
  })

  if (code.statements.at(-1)?.type === "expression")
    var expression = code.statements.splice(-1, 1)[0]

  if (!executor)
    (executor = new Executor({declarations : [], statements : []})).GO()

  tryCode(() => { executor.execBlock(code, false, {}, executor.currentEnv) })

  if (expression)
    tryCode(() => { executor.globalEnv.content.formatPrint.call(null, [executor.execExpression(expression.value)]) })
}

e("clearConsole").onclick = () => { e("consoleOutput").innerHTML = "" }

//––––––––––––––––––––––––––––––––//

const htmlFilePrefix = "<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>musubi program output</title></head><body>Musubi v0.4.1</body><script>var code=`",
      htmlFileSuffix = "`</script><script src=\"https://musubiminjs.pusheeeeenthecat.repl.co/c.js\"></script><script src=\"https://musubiminjs.pusheeeeenthecat.repl.co/d.js\"></script></html>"
function saveFile(htmlFile) {
  var a = document.createElement("a")

  a.href = "data:application/octet-stream," + encodeURIComponent(
    (htmlFile ? htmlFilePrefix : "") +
    //     preserve escapes      escape closing `    escape potential closing script tags
    code().replace("\\", "\\\\").replace("`", "\\`").replace("</", "<\\/") +
    (htmlFile ? htmlFileSuffix : "")
  )
  a.download = `${htmlFile ? "runnable_" : ""}musubi_program.${htmlFile ? "html" : "txt"}`
  a.click()
}

e("saveTxt").onclick = () => { saveFile() }
e("saveExec").onclick = () => { saveFile(true) }

//––––––––––––––––––––––––––––––––//

var executor, parser, tokenizer, characterizer, ast

var stack
e("go").onclick = run

function run() {
  consoleMsg("========Starting code processing========", "noJoinLog")

  var parsingTimer = false, execTimer = false
  try {
    console.log("========Starting code processing========")

    console.time("total")

    console.time("p init")
    initializeParser()
    console.timeEnd("p init")

    console.time("parsing")
    parsingTimer = true

    ast = parser.GO()

    console.timeEnd("parsing")
    parsingTimer = false

    console.time("e init")
    executor = new Executor(ast)
    console.timeEnd("e init")

    console.time("running")
    execTimer = true

    executor.GO()

    console.timeEnd("running")
    execTimer = false

    console.timeEnd("total")
  } catch (err) {
    if (parsingTimer) console.timeEnd("parsing")
    if (execTimer) console.timeEnd("running")
    console.timeEnd("total")

    consoleMsg(err, "error")

    if (err instanceof Error) problem(err.message, err.stack)

    stack = err.stack
  }
}

function initializeParser(parserCode = code()) {
  parser = new Parser(
    tokenizer = new Tokenizer(
      characterizer = new Characterizer(parserCode)
    )
  )
}

function consoleMsg(msg, type = null) {
  var scroll = false, removeMargin = false

  var symbol = "<div class = 'logArrow consoleSymbol'></div>"
  if (type === "error" || type === "problem") symbol = "<div class = 'errOuter consoleSymbol'><div class = 'errShadow'></div><div class = 'errWrapper'><div class = 'errInner'></div></div></div>"
  if (type === "warn") symbol = "<div class = 'warnRect consoleSymbol'></div>"

  if (consoleOutput.scrollTop + consoleOutput.offsetHeight + 3 > consoleOutput.scrollHeight) scroll = true
  if (type === "log" && consoleOutput.lastElementChild?.className.startsWith("log")) removeMargin = true

  consoleOutput.innerHTML += `<div ${removeMargin ? "style = 'margin-top: 0; padding: 2px 3px 5px;'" : ""} class = "${type ? type + " " : ""}consoleMsg">${symbol}<div class = "consoleMsgText">${msg}</div></div>`

  if (scroll) consoleOutput.scrollTop = consoleOutput.scrollHeight
}

const errorUserMsg = "It looks like you've discovered a bug in the code.\nPlease show this message and your code to a developer."
function problem(msg, stack) {
  var loc = location.href.replace("index.html", ""),
      err = new Error(msg)

  err.stack = err.stack.slice(err.stack.indexOf("\n"))

  var [_, fileName, pos] = (stack ?? err.stack).match(/(\w+\.\w+):(\d+:\d+)/)

  consoleMsg(`${errorUserMsg}\n\n${(stack ?? err.stack).replaceAll(loc, "./")}\n\n====================\n\n${fileName} ${pos}\n${err.message}`, "problem")

  var consoleErr = new Error(msg)

  consoleErr.name = "PROBLEM"

  throw consoleErr
}

function formatMessage(message, indent = "", recurseCount = 0) {
  var result, extra = "", truncResult = indent.length >= 24 || recurseCount >= 1

  if (message?._langClass)
    if (message.value === undefined) {
      extra = `<${message.func("toString").value}> `

      if (Object.values(message.data).includes(message)) recurseCount++

      message = message.data
    } else message = message.value

  if (typeof message === "string") result = `"${message}"`
  else if (message === null) result = "null"
  else if (truncResult) {
    delete message.toString

    result = "... " + (message._langClass ? message.func("toString").value : String(message))
  } else if (typeof message === "object") {
    var output

    if (Array.isArray(message)) {
      if (!message.length) result = "[]"
      else {
        output = "["

        message.forEach(x => { output += `\n${indent + "  "}${formatMessage(x, indent + "  ")},` })

        result = `${output.slice(0, -1)}\n${indent}]`
      }
    } else {
      if (!Object.keys(message).length) result = "{}"
      else {
        output = "{"

        Object.keys(message).forEach(x => { output += `\n${indent + "  "}${x} : ${formatMessage(message[x], indent + "  ", recurseCount)},` })

        result = `${output.slice(0, -1)}\n${indent}}`
      }
    }
  }

  return extra + (result || message)
}

// DEBUG TOOL

var showDebugMenu = false
e("langDebug").onclick = () => {
  showDebugMenu = !showDebugMenu

  if (showDebugMenu) {
    e("debugPanel").style.display = "block"
  } else {
    e("debugPanel").style.display = "none"
  }
}

e("debugCPeek").onclick = () => {
  var res = characterizer?.peek()
  if (res === "\n") res = "<i>[New line]</i>"

  log(`<i>[Debug]:</i> chars.js - peek: ${res} - currently at (L${line} C${column}).`)
}
e("debugCNext").onclick = () => {
  var res = characterizer?.next()
  if (res === "\n") res = "<i>[New line]</i>"

  log(`<i>[Debug]:</i> chars.js - next: <b>${res}</b> - now at (L${line} C${column}).`)
}
e("debugCEof").onclick = () => {
  var res = characterizer?.eof()

  log(`<i>[Debug]:</i> chars.js - &lt;EOF&gt;: <b>${res}</b> - currently at (L${line} C${column}).`)
}

e("debugTPeek").onclick = () => {
  var res = tokenizer?.peek()

  log(`<i>[Debug]:</i> tokens.js - peek: <b>{type: "${res.type}", value: "${res.value}"}</b> (${res.spaceBefore ? "" : "no "}space before) - currently at (L${line + 1} C${column}).`)
}
e("debugTNext").onclick = () => {
  var res = tokenizer?.next()

  log(`<i>[Debug]:</i> tokens.js - next: <b>{type: "${res.type}", value: "${res.value}"}</b> (${res.spaceBefore ? "" : "no "}space before) - now at (L${line + 1} C${column}).`)
}
e("debugTEof").onclick = () => {
  var res = tokenizer?.eof()

  log(`<i>[Debug]:</i> tokens.js - &lt;EOF&gt;: <b>${res}</b> - currently at (L${line} C${column}).`)
}

e("debugAST").onclick = () => {
  log(
    formatMessage(
      new Parser(
        new Tokenizer(
          new Characterizer(
            code()
          )
        )
      ).GO()
    )
  )
}
