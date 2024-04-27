//@ts-nocheck

import * as vscode from "vscode";
import {
  parseWorkspaceFiles,
  getContractAndHandlerFromFileAst,
} from "./parser";

export function activate(context: vscode.ExtensionContext) {
  const switchCommand = vscode.commands.registerCommand(
    "extension.tsRestSwitch",
    async () => {
      await navigate();
    }
  );

  context.subscriptions.push(switchCommand);

  async function navigate() {
    const filesMap = await parseWorkspaceFiles();

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const currentFilePath = editor.document.uri.fsPath;
    const currentAst = filesMap.get(currentFilePath);
    if (!currentAst) {
      vscode.window.showInformationMessage("No AST found for current file.");
      return;
    }

    const cursorPosition = editor.selection.active;
    const cursorOffset = editor.document.offsetAt(cursorPosition);
    // const contractRouterMap = buildContractRouterMapping(filesMap);
    const result = getContractAndHandlerFromFileAst(currentAst);
    if (!Object.keys(result)?.length) {
      return;
    }

    // where is our cursor in the result
    const key = Object.keys(result).find((key) => {
      const { start, end } = result[key];
      return (
        cursorPosition.line + 1 >= start.line &&
        cursorPosition.line + 1 <= end.line
      );
    });
    if (!key) {
      return;
    }
    const splitkey = key?.split("_");
    if (splitkey[0] === "handler") {
      splitkey[0] = "contract";
    } else {
      splitkey[0] = "handler";
    }
    const requiredKey = splitkey?.join("_");

    for (const [filePath, ast] of filesMap) {
      const result = getContractAndHandlerFromFileAst(ast);
      const ch = result?.[requiredKey];
      if (ch) {
        await goToLocationInFile(filePath, ch.start.line, ch.start.column);
      }
    }


  }
}
async function goToLocationInFile(
  filePath: string,
  lineNumber: number,
  columnNumber: number
) {
  try {
    // Step 1: Open the text document
    const document = await vscode.workspace.openTextDocument(filePath);

    // Step 2: Show the document
    const editor = await vscode.window.showTextDocument(document);

    // Step 3: Create a position
    const position = new vscode.Position(lineNumber - 1, columnNumber - 1); // Note: VS Code uses 0-based indexing

    // Step 4: Set the cursor position and reveal it
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );
  } catch (error) {
    vscode.window.showErrorMessage("Failed to open file: " + error.message);
  }
}
