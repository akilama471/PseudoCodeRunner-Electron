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
    let variableDiv = document.getElementById("variables"); // Variable Viewer
    outputDiv.innerHTML = "";  // Clear previous output
    variableDiv.innerHTML = ""; // Clear previous variables

    let variables = {};  // Store variable values
    let i = 0;
    let stack = [];
    pausedAtBreakpoint = false;

    try {
        while (i < lines.length) {
            let line = lines[i].toUpperCase();

            if (line.startsWith("BEGIN")) {
                stack.push("BEGIN");
            }

            // Output statements
            if (line.startsWith("OUTPUT") || line.startsWith("DISPLAY") || line.startsWith("SHOW")) {
                let text = line.split(" ").slice(1).join(" ");
                outputDiv.innerHTML += (variables[text] !== undefined ? variables[text] : text) + "<br>";
            }

            // Variable assignment (e.g., X = 5)
            else if (line.includes("=")) {
                let [varName, value] = line.split("=").map(s => s.trim());
                variables[varName] = isNaN(value) ? value.replace(/"/g, "") : parseInt(value);
                updateVariableViewer(variables);
            }

            // IF-THEN-ELSE-ENDIF
            else if (line.startsWith("IF")) {
                let condition = line.substring(3, line.indexOf("THEN")).trim();
                let isTrue = evaluateCondition(condition, variables);
                let insideElse = false;

                while (i < lines.length) {
                    i++;
                    let subLine = lines[i].toUpperCase().trim();

                    if (subLine === "ELSE") {
                        insideElse = true;
                    } else if (subLine === "ENDIF") {
                        break;
                    } else if ((isTrue && !insideElse) || (!isTrue && insideElse)) {
                        executeLine(subLine, variables, outputDiv);
                    }
                }

                if (!stack.includes("IF")) throwError("Missing ENDIF", i);
            }

            // FOR-DO loop (e.g., FOR X = 1 TO 5 DO)
            else if (line.startsWith("FOR")) {
                let match = line.match(/FOR (\w+) = (\d+) TO (\d+) DO/);
                if (match) {
                    let [, varName, start, end] = match;
                    start = parseInt(start);
                    end = parseInt(end);
                    stack.push("FOR");

                    let loopBody = [];
                    while (i < lines.length) {
                        i++;
                        if (lines[i].toUpperCase().trim() === "END") {
                            stack.pop();
                            break;
                        }
                        loopBody.push(lines[i].trim());
                    }

                    if (stack.includes("FOR")) throwError("Missing END for FOR loop", i);

                    for (let j = start; j <= end; j++) {
                        variables[varName] = j;
                        updateVariableViewer(variables);
                        loopBody.forEach(subLine => executeLine(subLine, variables, outputDiv));
                    }
                }
            }

            // WHILE-ENDWHILE loop
            else if (line.startsWith("WHILE")) {
                let condition = line.substring(6).trim();
                let loopStart = i;
                stack.push("WHILE");

                while (evaluateCondition(condition, variables)) {
                    let loopBody = [];
                    while (i < lines.length) {
                        i++;
                        if (lines[i].toUpperCase().trim() === "ENDWHILE") {
                            stack.pop();
                            break;
                        }
                        loopBody.push(lines[i].trim());
                    }
                    loopBody.forEach(subLine => executeLine(subLine, variables, outputDiv));
                    i = loopStart; // Repeat loop
                }

                if (stack.includes("WHILE")) throwError("Missing ENDWHILE", i);
            }

            // REPEAT-UNTIL loop
            else if (line.startsWith("REPEAT")) {
                let loopStart = i;
                let loopBody = [];
                stack.push("REPEAT");

                while (i < lines.length) {
                    i++;
                    let subLine = lines[i].trim();

                    if (subLine.toUpperCase().startsWith("UNTIL")) {
                        stack.pop();
                        let condition = subLine.substring(6).trim();

                        do {
                            loopBody.forEach(subLine => executeLine(subLine, variables, outputDiv));
                            updateVariableViewer(variables);
                        } while (!evaluateCondition(condition, variables));

                        break;
                    } else {
                        loopBody.push(subLine);
                    }
                }
                if (stack.includes("REPEAT")) throwError("Missing UNTIL for REPEAT loop", i);
            }

            // END block
            else if (line.startsWith("END")) {
                if (stack.length === 0 || stack[stack.length - 1] !== "BEGIN") {
                    throwError("Unexpected END", i);
                }
                stack.pop();
            }

            i++;
        }
        // Check for unclosed structures
        if (stack.length > 0) {
            throwError(`Missing closing for: ${stack[stack.length - 1]}`, i);
        }
    } catch (error) {
        outputDiv.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
    }
}

// Function to evaluate conditions (e.g., "X > 5")
function evaluateCondition(condition, variables) {
    let [left, operator, right] = condition.split(" ");
    left = isNaN(left) ? variables[left] || 0 : parseInt(left);
    right = isNaN(right) ? variables[right] || 0 : parseInt(right);

    switch (operator) {
        case ">": return left > right;
        case "<": return left < right;
        case "==": return left == right;
        case "!=": return left != right;
        default: return false;
    }
}

// Function to execute a single line of pseudo code
function executeLine(line, variables, outputDiv) {
    line = line.toUpperCase();

    if (line.startsWith("OUTPUT") || line.startsWith("DISPLAY") || line.startsWith("SHOW")) {
        let text = line.split(" ").slice(1).join(" ");
        text = variables[text] !== undefined ? variables[text] : text;
        outputDiv.innerHTML += text + "<br>";
    } else if (line.includes("=")) {
        let [varName, value] = line.split("=").map(s => s.trim());
        variables[varName] = isNaN(value) ? value.replace(/"/g, "") : parseInt(value);
        updateVariableViewer(variables);
    }
}

// Function to update the Variable Viewer
function updateVariableViewer(variables) {
    let variableDiv = document.getElementById("variables");
    variableDiv.innerHTML = "<h3>Variables</h3>";
    Object.keys(variables).forEach(varName => {
        variableDiv.innerHTML += `<p><strong>${varName}</strong>: ${variables[varName]}</p>`;
    });
}

// Function to throw an error with line number
function throwError(message, lineNumber) {
    throw new Error(`${message} at line ${lineNumber + 1}`);
}
