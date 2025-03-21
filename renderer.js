require(["vs/editor/editor.main"], function () {
    monaco.languages.register({ id: "pseudocode" });

    // Define syntax highlighting
    monaco.languages.setMonarchTokensProvider("pseudocode", {
        tokenizer: {
            root: [
                [/\b(BEGIN|END|IF|THEN|ELSE|ENDIF|FOR|DO|END|WHILE|ENDWHILE|REPEAT|UNTIL|OUTPUT|DISPLAY|SHOW|INPUT|GET|READ|PROCESS|CALCULATE)\b/, "keyword"],
                [/"[^"]*"/, "string"],   // Strings inside double quotes
                [/\b[0-9]+\b/, "number"], // Numbers
                [/\b[A-Z_][A-Z0-9_]*\b/, "identifier"], // Variables
            ],
        },
    });

    // Define auto-indentation rules
    monaco.languages.setLanguageConfiguration("pseudocode", {
        autoClosingPairs: [{ open: '"', close: '"' }],
        brackets: [
            ["BEGIN", "END"],
            ["IF", "ENDIF"],
            ["FOR", "END"],
            ["WHILE", "ENDWHILE"],
            ["REPEAT", "UNTIL"]
        ],
        indentationRules: {
            increaseIndentPattern: /^\s*(IF|THEN|FOR|DO|WHILE|REPEAT).*$/,
            decreaseIndentPattern: /^\s*(ENDIF|UNTIL|ENDWHILE).*$/,
        }
    });

    // Define code formatter
    monaco.languages.registerDocumentFormattingEditProvider("pseudocode", {
        provideDocumentFormattingEdits(model) {
            let formattedCode = formatPseudoCode(model.getValue());
            return [
                {
                    range: model.getFullModelRange(),
                    text: formattedCode,
                },
            ];
        }
    });

    // Create the Monaco Editor
    editor = monaco.editor.create(document.getElementById("editorContainer"), {
        value: "BEGIN\n    OUTPUT \"Hello, World!\"\nEND",
        language: "pseudocode",
        theme: "vs-dark",
        fontSize: 16,
        automaticLayout: true
    });

    monaco.languages.registerCompletionItemProvider("pseudocode", {
        provideCompletionItems: function () {
            let suggestions = [
                { label: "BEGIN", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "BEGIN" },
                { label: "END", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "END" },
                { label: "OUTPUT", kind: monaco.languages.CompletionItemKind.Function, insertText: "OUTPUT \"\"" },
                { label: "DISPLAY", kind: monaco.languages.CompletionItemKind.Function, insertText: "DISPLAY \"\"" },
                { label: "SHOW", kind: monaco.languages.CompletionItemKind.Function, insertText: "SHOW \"\"" },
                { label: "INPUT", kind: monaco.languages.CompletionItemKind.Function, insertText: "INPUT \"\"" },
                { label: "READ", kind: monaco.languages.CompletionItemKind.Function, insertText: "READ \"\"" },
                { label: "GET", kind: monaco.languages.CompletionItemKind.Function, insertText: "GET \"\"" },
                { label: "IF", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "IF condition THEN\n    \nELSE\n    \nENDIF" },
                { label: "FOR", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "FOR i = 1 TO 10 DO\n    \nEND" },
                { label: "WHILE", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "WHILE condition\n    \nENDWHILE" },
                { label: "REPEAT", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "REPEAT\n    \nUNTIL condition" }
            ];
            return { suggestions: suggestions };
        }
    });

    // Function to format pseudo code
    function formatPseudoCode(code) {
        let formatted = "";
        let indentLevel = 0;
        let indentSize = "    "; // 4 spaces

        code.split("\n").forEach(line => {
            let trimmed = line.trim();
            if (trimmed.match(/^(END|ENDIF|UNTIL|ENDWHILE)/)) indentLevel--;

            formatted += indentSize.repeat(Math.max(indentLevel, 0)) + trimmed + "\n";

            if (trimmed.match(/^(BEGIN|IF|THEN|FOR|DO|WHILE|REPEAT)/)) indentLevel++;
        });

        return formatted.trim();
    }
});

function runPseudoCode() {
    let code = editor.getValue(); // Get code from Monaco Editor
    let lines = code.split("\n").map(line => line.trim());
    let outputDiv = document.getElementById("output");
    let variableDiv = document.getElementById("variables"); // Variable Viewer
    outputDiv.innerHTML = "";  // Clear previous output
    variableDiv.innerHTML = ""; // Clear previous variables

    let variables = {};  // Store variable values
    let variableTypes = {}; // Store variable types
    let i = 0;
    let stack = []; // Block tracking
    let loopStack = []; // Loop tracking
    let ifStack = []; // IF-THEN-ELSE tracking

    try {
        while (i < lines.length) {
            let line = lines[i].toUpperCase().trim();

            // BEGIN - Push to Stack
            if (line.startsWith("BEGIN")) {
                stack.push("BEGIN");
            }

            // OUTPUT / DISPLAY / SHOW statements
            else if (line.startsWith("OUTPUT") || line.startsWith("DISPLAY") || line.startsWith("SHOW")) {
                let text = line.split(" ").slice(1).join(" ");
                outputDiv.innerHTML += (variables[text] !== undefined ? variables[text] : text) + "<br>";
            }

            // Variable Assignment (e.g., X = 5 or X = X + 1), but avoid IF/UNTIL conditions
            else if (line.includes("=") && !/^(IF|UNTIL|WHILE)/.test(line)) {
                let [varName, expression] = line.split("=").map(s => s.trim());
            
                // Ensure varName is a valid identifier (letters + numbers, no spaces)
                if (!/^[A-Z][A-Z0-9]*$/i.test(varName)) {
                    throwError(`Invalid variable name: ${varName}`, i);
                }
            
                try {
                    // Replace variable names with their values before evaluation
                    let evalExpression = expression.replace(/\b[A-Z_][A-Z0-9]*\b/g, match => {
                        if (variables.hasOwnProperty(match)) {
                            return variables[match]; // Replace with actual value
                        }
                        return match; // Keep it unchanged (e.g., numbers)
                    });
                            
                    // Evaluate the expression safely
                    let result = Function(`"use strict"; return (${evalExpression});`)();
            
                    // Determine the result's type
                    let newType = typeof result;
                    if (newType === "number") newType = "number";
                    else if (typeof result === "boolean") newType = "boolean";
                    else if (typeof result === "string") newType = "string";
            
                    // If variable exists, check type consistency
                    if (variableTypes[varName] && variableTypes[varName] !== newType) {
                        throwError(`Type mismatch: Variable '${varName}' was declared as ${variableTypes[varName]} but assigned ${newType}`, i);
                    }
            
                    // Store the result and its type
                    variables[varName] = result;
                    if (!variableTypes[varName]) {
                        variableTypes[varName] = newType; // Store initial type
                    }
            
                    updateVariableViewer(variables);
                } catch (error) {
                    throwError(`Invalid expression: ${expression}`, i);
                }
            }

            // IF-THEN-ELSE-ENDIF Handling
            else if (line.startsWith("IF")) {
                let condition = line.substring(3, line.indexOf("THEN")).trim();
                let isTrue = evaluateCondition(condition, variables);

                console.log(`IF condition '${condition}' evaluated to: ${isTrue}`);
                ifStack.push({ isTrue, elseReached: false });

                if (!isTrue) {
                    while (i < lines.length){
                        let subLine = lines[i].toUpperCase().trim();
                         if (subLine.startsWith("ELSE")) {
                            ifStack[ifStack.length - 1].elseReached = true;
                            break;
                        } else if (subLine.startsWith("ENDIF")) {
                            break;
                        }
                        console.log(`Skipping: ${lines[i]}`);
                        i++;
                    }
                }
            } else if (line.startsWith("ELSE")) {
                if (ifStack.length === 0) throwError("Unexpected ELSE", i);
                let lastIf = ifStack[ifStack.length - 1];

                if (lastIf.isTrue) {
                    console.log("Skipping ELSE block...");
                    while (i < lines.length && !lines[i].toUpperCase().trim().startsWith("ENDIF")) {
                        i++;
                    }
                } else {
                    lastIf.elseReached = true;
                    console.log("Executing ELSE block...");
                }
            } else if (line.startsWith("ENDIF")) {
                console.log("Popping IF block from stack");
                if (ifStack.length === 0) throwError("Unexpected ENDIF", i);
                console.log("Popping IF block from stack");
                ifStack.pop();
            }

            // FOR-DO-END Loop Handling
            else if (line.startsWith("FOR")) {
                let match = line.match(/FOR (\w+) = (\d+) TO (\d+) DO/);
                if (match) {
                    let [, varName, start, end] = match;
                    start = parseInt(start);
                    end = parseInt(end);
                    variables[varName] = start;
                    loopStack.push({ varName, start, end, startIndex: i });
                }
            } else if (line === "END" && loopStack.length > 0) {
                let loop = loopStack[loopStack.length - 1];
                if (variables[loop.varName] < loop.end) {
                    variables[loop.varName]++;
                    i = loop.startIndex;
                } else {
                    loopStack.pop();
                }
            }

            // WHILE-ENDWHILE Loop Handling
            else if (line.startsWith("WHILE")) {
                let condition = line.substring(6).trim();
                if (evaluateCondition(condition, variables)) {
                    loopStack.push({ type: "WHILE", condition, startIndex: i });
                } else {
                    while (i < lines.length && lines[i].toUpperCase().trim() !== "ENDWHILE") {
                        i++;
                    }
                }
            } else if (line === "ENDWHILE") {
                let loop = loopStack.pop();
                if (!loop || loop.type !== "WHILE") throwError("Unexpected ENDWHILE", i);
                if (evaluateCondition(loop.condition, variables)) {
                    i = loop.startIndex - 1;
                }
            }

            // REPEAT-UNTIL Loop Handling
            else if (line.startsWith("REPEAT")) {
                loopStack.push({ type: "REPEAT", startIndex: i, iterations: 0 });
            } else if (line.startsWith("UNTIL")) {
                let condition = line.substring(6).trim();
                let loop = loopStack.pop();
                if (!loop || loop.type !== "REPEAT") throwError("Unexpected UNTIL", i);

                // Limit iterations to avoid infinite loops
                loop.iterations++;
                if (loop.iterations > 1000) {
                    throwError("Potential infinite loop detected in REPEAT-UNTIL", i);
                }

                if (!evaluateCondition(condition, variables)) {
                    i = loop.startIndex - 1;
                }
            }

            // END Handling
            else if (line.startsWith("END")) {
                if (stack.length === 0 || stack[stack.length - 1] !== "BEGIN") {
                    throwError("Unexpected END", i);
                }
                stack.pop();
            }

            i++;
        }

        // Check for unclosed structures
        if (stack.length > 0) throwError(`Missing END for ${stack[stack.length - 1]}`, i);
        if (ifStack.length > 0) throwError("Missing ENDIF", i);
        if (loopStack.length > 0) throwError("Missing END for loop", i);
    } catch (error) {
        outputDiv.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
    }
}

function evaluateCondition(condition, variables) {
    let [left, operator, right] = condition.split(" ");
    
    // Convert left and right to their proper values
    left = isNaN(left) ? variables[left] || 0 : parseFloat(left);
    right = isNaN(right) ? variables[right] || 0 : parseFloat(right);

    console.log(`Evaluating Condition: ${left} ${operator} ${right}`);

    switch (operator) {
        case ">": return left > right;
        case "<": return left < right;
        case "==": return left == right;
        case "!=": return left != right;
        default: 
            throwError(`Unknown operator: ${operator}`, -1);
            return false;
    }
}


function throwError(message, lineNumber) {
    throw new Error(`${message} at line ${lineNumber + 1}`);
}

// Function to update the Variable Viewer
function updateVariableViewer(variables) {
    let variableDiv = document.getElementById("variables");
    variableDiv.innerHTML = "<h3>Variables</h3>";
    Object.keys(variables).forEach(varName => {
        variableDiv.innerHTML += `<p><strong>${varName}</strong>: ${variables[varName]}</p>`;
    });
}