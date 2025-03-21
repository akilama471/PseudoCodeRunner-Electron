let breakpoints = new Set(); // Stores line numbers where breakpoints are set
let pausedAtBreakpoint = false;

function toggleBreakpoint(lineNumber) {
    if (breakpoints.has(lineNumber)) {
        breakpoints.delete(lineNumber);
    } else {
        breakpoints.add(lineNumber);
    }
    updateBreakpointUI();
}

function updateBreakpointUI() {
    let codeArea = document.getElementById("codeInput");
    let lines = codeArea.value.split("\n");
    let highlightedCode = lines
        .map((line, index) => (breakpoints.has(index) ? `<mark style="background: red;">${line}</mark>` : line))
        .join("\n");

    codeArea.innerHTML = highlightedCode;
}

function runPseudoCode() {
    let code = document.getElementById("codeInput").value;
    let lines = code.split("\n").map(line => line.trim());
    let outputDiv = document.getElementById("output");
    let variableDiv = document.getElementById("variables");
    outputDiv.innerHTML = "";
    variableDiv.innerHTML = "";
    let variables = {};
    let i = 0;
    let stack = [];
    pausedAtBreakpoint = false;

    function executeNext() {
        if (pausedAtBreakpoint || i >= lines.length) return;

        let line = lines[i].toUpperCase();
        if (breakpoints.has(i)) {
            pausedAtBreakpoint = true;
            return; // Pause execution at the breakpoint
        }

        processLine(line, variables, outputDiv, stack);
        i++;

        setTimeout(executeNext, 300); // Delay to simulate step-by-step execution
    }

    executeNext();
}

function continueExecution() {
    pausedAtBreakpoint = false;
    runPseudoCode();
}

function processLine(line, variables, outputDiv, stack) {
    if (line.startsWith("OUTPUT") || line.startsWith("DISPLAY") || line.startsWith("SHOW")) {
        let text = line.split(" ").slice(1).join(" ");
        outputDiv.innerHTML += (variables[text] !== undefined ? variables[text] : text) + "<br>";
    } else if (line.includes("=")) {
        let [varName, value] = line.split("=").map(s => s.trim());
        variables[varName] = isNaN(value) ? value.replace(/"/g, "") : parseInt(value);
        updateVariableViewer(variables);
    }
}

function updateVariableViewer(variables) {
    let variableDiv = document.getElementById("variables");
    variableDiv.innerHTML = "<h3>Variables</h3>";
    Object.keys(variables).forEach(varName => {
        variableDiv.innerHTML += `<p><strong>${varName}</strong>: ${variables[varName]}</p>`;
    });
}
