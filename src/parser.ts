//@ts-nocheck
import * as vscode from "vscode";
import { parse } from "@typescript-eslint/typescript-estree";
import * as fs from "fs";
import * as path from "path";

export async function parseWorkspaceFiles(): Promise<Map<string, any>> {
  const filesMap = new Map<string, any>();
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    return filesMap;
  }

  for (const folder of workspaceFolders) {
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, "**/*.ts"), // Adjust the pattern for other file types if needed
      "**/node_modules/**", // Exclude node_modules
      100 // Limit for performance, adjust as necessary
    );

    for (const file of files) {
      const content = fs.readFileSync(file.fsPath, "utf8");
      try {
        const ast = parse(content, {
          loc: true,
          comment: true,
          tokens: true,
          ecmaVersion: "latest",
          sourceType: "module",
        });
        filesMap.set(file.fsPath, ast);
      } catch (error) {
        console.error(`Error parsing ${file.fsPath}: ${error}`);
      }
    }
  }

  return filesMap;
}

export function getContractAndHandlerFromFileAst(ast: any): any {
  if (!ast || !ast.body) {
    return "unknown";
  }

  let values = {};
  for (const node of ast.body) {
    const declarator = node.declaration?.declarations?.[0];
    if (!declarator) {
      continue;
    }
    if (declarator.init?.callee?.property?.name === "router")
      if (declarator.init?.arguments?.[0]?.type === "ObjectExpression") {
        declarator.init?.arguments?.[0].properties?.forEach((item) => {
          if (item?.key?.name) {
            values[`contract_${declarator.id.name}_${item?.key?.name}`] =
              item?.loc;
          }
        });
      } else if (declarator.init?.arguments?.[1]?.type === "ObjectExpression") {
        declarator.init?.arguments?.[1].properties?.forEach((item) => {
          if (item?.key?.name) {
            values[
              `handler_${declarator.init.arguments[0].name}_${item?.key?.name}`
            ] = item?.loc;
          }
        });
      }
  }

  return values;
}

