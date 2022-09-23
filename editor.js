function e(elem) { return document.getElementById(elem) }
function code() { return document.getElementById("input").value }

//––––––––––––––––––––––––––––––––//

const versionNumber = "0.5.0",
      versionText = "lots of internal changes mostly related to types, reference parser mostly rewritten"

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
    var key = x.data,
        output
    
    if (key === "(") output = ")"
    else if (key === "[") output = "]"
    else if (key === "{") output = "}"
    else if (key === "\"") output = "\""
    else if (key === "'") output = "'"
    else if (key === "`") output = "`"
    else return;

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
      console.log("u pressed the (unimplemented) tabby tabber key")
      
      x.preventDefault()
    }
    
    if (key === "(") output = ["(", ")"]
    else if (key === "[") output = ["[", "]"]
    else if (key === "{") output = ["{", "}"]
    else if (key === "\"") output = ["\"", "\""]
    else if (key === "'") output = ["'", "'"]
    else if (key === "`") output = ["`", "`"]
    else return;
    
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
      console.log("u pressed the (unimplemented) tabby tabber key")
      
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
      afterCursor = code().slice(cursorPos)

  var currentLine = beforeCursor ? beforeCursor.split("\n").pop().trim() : ""

  var doKeywordIndent = (/^(if|else|for|while|repeat|function|loop)\b[^:]*$/.test(currentLine) &&
      !currentLine.endsWith(";") && !currentLine.endsWith("end")) ||
      /\b(block)((\s+[\w\s,]+)|(\([\w\s,]+\)))?$/.test(currentLine)

  var openSquare = currentLine.match(/\[/g)?.length || 0 - currentLine.match(/]/g)?.length || 0,
      openCurly = currentLine.match(/{/g)?.length || 0 - currentLine.match(/}/g)?.length || 0

  var indent = 0
  if (beforeCursor && ("{[&|*^=".includes(beforeCursor.slice(-1)) || doKeywordIndent)) indent = 2
  if (deIndent || (openSquare === 0 && afterCursor.startsWith("]"))
    || (openCurly === 0 && afterCursor.startsWith("}")) ||
    afterCursor.startsWith("end") || afterCursor.startsWith(";")) indent = -2
  
  var prevIndent = Math.floor(beforeCursor.split("\n").pop().search(/\S|$/))

  var indents = ""
  for (let i = 0; i < prevIndent + indent; i++) indents += " "

  e("input").value = beforeCursor + "\n" + indents + (deIndent === "end" ? "end" : "") + afterCursor

  cursorPos = cursorPos + 1 + Math.max(0, prevIndent + indent)

  if (doKeywordIndent) newLine(cursorPos, "end")

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

e("consoleInput").onkeydown = () => {
  if (event.code === "Enter") {
    consoleMsg(e("consoleInput").value.trim(), "input")

    parseCommand(e("consoleInput").value.trim().replace(/\s{2,}/g, " "))

    e("consoleInput").value = ""
  }
}

function parseCommand(command) {
  var tokens = command.split(" ")
  if (tokens[0] === "ast") {
    if (tokens[1] === "decl") consoleMsg(formatMessage(ast?.declarations) || "no ast", "log")
    else if (tokens[1] === "stat") consoleMsg(formatMessage(ast?.statements) || "no ast", "log")
    else consoleMsg(formatMessage(ast) || "no ast", "log")
  } else if (tokens[0] === "code")
    consoleMsg(code(), "log")
  else if (tokens[0] === "run")
    run()
  else if (tokens[0] === "save")
    saveFile(tokens[1] === "html")
}

var showBugTracker = false
e("bugReportClose").onclick = e("bugTracker").onclick = () => {
  showBugTracker = !showBugTracker

  if (showBugTracker) {
    e("flexContainer").style.filter = "brightness(35%)"
    e("flexContainer").style.pointerEvents = "none"
    e("bugReportPopup").style.opacity = "1"
    e("bugReportPopup").style.pointerEvents = "all"
  } else {
    e("flexContainer").style.filter = "none"
    e("flexContainer").style.pointerEvents = "all"
    e("bugReportPopup").style.opacity = "0"
    e("bugReportPopup").style.pointerEvents = "none"
  }
}
var bugId = parseInt(localStorage.getItem("bugId")) || 0
function updateBugs() {
  e("bugList").innerHTML = ""

  if (localStorage.getItem("bugs")) {
    localStorage.getItem("bugs").split("º").forEach(x => {
      var bugElem = document.createElement("details"),
          bugTitle = document.createElement("summary"),
          bugResolve = document.createElement("button")

      bugElem.className = "bugText"
      bugTitle.className = "bugTitle"
      bugResolve.className = "popupButton bugResolve"
      bugResolve.id = x.split("ª")[0]

      bugResolve.onclick = y => {
        var bugs = localStorage.getItem("bugs").split("º"), id = y.target.id

        for (var i = 0; i < bugs.length; i++)
          if (bugs[i].split("ª")[0] === id) {
            bugs.splice(i, 1)

            break
          }

        localStorage.setItem("bugs", bugs.join("º"))

        y.target.parentElement.remove()
      }

      bugTitle.appendChild(document.createTextNode(x.split("ª")[1]))
      bugResolve.appendChild(document.createTextNode("resolve"))

      bugElem.appendChild(bugTitle)
      bugElem.appendChild(bugResolve)
      bugElem.appendChild(document.createTextNode(x.split("ª")[2]))

      e("bugList").appendChild(bugElem)
    })
  }
}
updateBugs()
e("bugSubmit").onclick = () => {
  var bugText = `${bugId++}ª${e("bugTitle").value}ª${e("bugInput").value}`

  localStorage.setItem("bugId", bugId)

  localStorage.setItem("bugs", localStorage.getItem("bugs") ? localStorage.getItem("bugs") + "º" + bugText : bugText)

  updateBugs()
}
e("clearConsole").onclick = () => { e("consoleOutput").innerHTML = "" }

//––––––––––––––––––––––––––––––––//

const htmlFilePrefix = "<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>musubi program output</title></head><body>Musubi v0.4.1</body><script>var code=`",
      htmlFileSuffix = "`</script><script src=\"https://musubiminjs.pusheeeeenthecat.repl.co/c.js\"></script><script src=\"https://musubiminjs.pusheeeeenthecat.repl.co/d.js\"></script></html>"
function saveFile(htmlFile) {
  var a = document.createElement("a")
  a.href = "data:application/octet-stream," + encodeURIComponent(
    (htmlFile ? htmlFilePrefix : "") +
    //     preserve escapes      escape closing `    escape unintentional html closing tags
    code().replace("\\", "\\\\").replace("`", "\\`").replace("<\/", "<\\/") +
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

  setTimeout(() => {
    try {
      initializeParser()
      ast = parser.GO()

      executor = new Executor(ast)
      executor.GO()
    } catch (err) {
      consoleMsg(err, "error")

      if (err instanceof Error) problem(err.message, err.stack)

      stack = err.stack
    }
  }, 100)
}

function initializeParser() {
  parser = new Parser(
    tokenizer = new Tokenizer(
      characterizer = new Characterizer(code())
    )
  )
}

function consoleMsg(msg, type) {
  var scroll = false, removeMargin = false

  var symbol = "<div class = 'logArrow consoleSymbol'></div>"
  if (type === "error" || type === "problem") symbol = "<div class = 'errOuter consoleSymbol'><div class = 'errShadow'></div><div class = 'errWrapper'><div class = 'errInner'></div></div></div>"
  if (type === "warn") symbol = "<div class = 'warnRect consoleSymbol'></div>"

  if (consoleOutput.scrollTop + consoleOutput.offsetHeight + 3 > consoleOutput.scrollHeight) scroll = true
  if (type === "log" && consoleOutput.lastElementChild?.className.startsWith("log")) removeMargin = true
  consoleOutput.innerHTML += `<div ${removeMargin ? "style = 'margin-top: 0; padding: 2px 3px 5px;'" : ""} class = "${type} consoleMsg">${symbol}<div class = "consoleMsgText">${msg}</div></div>`
  if (scroll) consoleOutput.scrollTop = consoleOutput.scrollHeight
}

const errorUserMsg = "It looks like you've discovered a bug in the code.\nPlease show this message and your code to a developer."
function problem(msg, stack) {
  console.log("%cPROBLEM:", "font-weight: 700; color: red; text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);")
  console.error(msg)

  var loc = location.href.replace("index.html", ""),
      err = new Error(msg)

  err.stack = err.stack.slice(err.stack.indexOf("\n"))

  consoleMsg(`${errorUserMsg}\n\n====================\n${err.line}:${err.column}\n${err.message}\n====================\n\n${(stack ?? err.stack).replaceAll(loc, "./")}`, "problem")
}

function formatMessage(message, indent = "") {
  if (typeof message === "string") return `"${message}"`
  else if (typeof message === "object") {
    if (Array.isArray(message)) {
      if (!message.length) return "[]"

      var output = "["

      message.forEach(x => { output += `\n${indent + "  "}${formatMessage(x, indent + "  ")},` })

      return `${output.slice(0, -1)}\n${indent}]`
    } else {
      if (!Object.keys(message).length) return "{}"

      var output = "{"

      Object.keys(message).forEach(x => { output += `\n${indent + "  "}${x} : ${formatMessage(message[x], indent + "  ")},` })

      return `${output.slice(0, -1)}\n${indent}}`
    }
  }

  return message
}

// DEBUG TOOL:

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
  parser = new Parser(
    tokenizer = new Tokenizer(
      characterizer = new Characterizer(code())
    )
  )

  log(formatMessage(parser.GO()))
}
