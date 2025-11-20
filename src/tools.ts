import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// 工具方法实现
export const toolHandlers = {
    getProjectPath: async (): Promise<string> => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return workspaceFolders[0].uri.fsPath;
        }
        throw new Error('没有打开的工作区');
    },
    readDirectory: async (params: { dirPath: string }): Promise<string[]> => {
        try {
            const files = await fs.promises.readdir(params.dirPath, { withFileTypes: true });
            return files.map(file => {
                const fullPath = path.join(params.dirPath, file.name);
                return file.isDirectory() ? `[目录] ${file.name}` : `[文件] ${file.name}`;
            });
        } catch (error) {
            throw new Error(`读取目录失败: ${error}`);
        }
    },

    readFile: async (params: { filePath: string }): Promise<string> => {
        try {
            const content = await fs.promises.readFile(params.filePath, 'utf-8');
            return content;
        } catch (error) {
            throw new Error(`读取文件失败: ${error}`);
        }
    },

    writeFile: async (params: { filePath: string; fileData: string }): Promise<string> => {
        try {
            // 确保目录存在
            const dir = path.dirname(params.filePath);
            await fs.promises.mkdir(dir, { recursive: true });
            
            await fs.promises.writeFile(params.filePath, params.fileData, 'utf-8');
            return `文件已成功写入: ${params.filePath}`;
        } catch (error) {
            throw new Error(`写入文件失败: ${error}`);
        }
    },

    getCurrentFilePath: async (): Promise<string> => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document) {
            return activeEditor.document.uri.fsPath;
        }
        throw new Error('没有打开的文件');
    },

    getAllOpenFiles: async (): Promise<string[]> => {
        const openFiles: string[] = [];
        vscode.workspace.textDocuments.forEach(doc => {
            if (!doc.isUntitled) {
                openFiles.push(doc.uri.fsPath);
            }
        });
        return openFiles;
    },

    getCurrentSelection: async (): Promise<{ start: number; end: number; text: string; line: number }> => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            throw new Error('没有活动的编辑器');
        }
        
        const selection = activeEditor.selection;
        const document = activeEditor.document;
        const selectedText = document.getText(selection);
        
        return {
            start: selection.start.character,
            end: selection.end.character,
            text: selectedText,
            line: selection.start.line
        };
    },

    getCurrentLineContent: async (): Promise<string> => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            throw new Error('没有活动的编辑器');
        }
        
        const line = activeEditor.selection.active.line;
        return activeEditor.document.lineAt(line).text;
    },

    getCursorInfo: async (): Promise<{ line: number; column: number; totalLines: number }> => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            throw new Error('没有活动的编辑器');
        }
        
        const position = activeEditor.selection.active;
        const document = activeEditor.document;
        
        return {
            line: position.line,
            column: position.character,
            totalLines: document.lineCount
        };
    },

    openFileToEdit: async (params: { filePath: string }): Promise<string> => {
        try {
            const uri = vscode.Uri.file(params.filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            return `文件已打开: ${params.filePath}`;
        } catch (error) {
            throw new Error(`打开文件失败: ${error}`);
        }
    }
};

// 工具定义
export const tools = [
  {
      "type": "function",
      "function":{
          name: "getProjectPath",
          description: "返回当前打开的工作区的绝对路径",
          parameters: {
            type: "object",
            properties: {},
            required:[]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "readDirectory",
          description: "读取指定路径下的文件和文件夹列表",
          parameters: {
            type: "object",
            properties: {
              dirPath:{
                type: "string",
                description: "指定路径的绝对路径"
              }
            },
            required:["dirPath"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "readFile",
          description: "读取指定文件路径的内容",
          parameters: {
            type: "object",
            properties: {
              filePath:{
                type: "string",
                description: "指定文件的绝对路径"
              }
            },
            required:["filePath"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "writeFile",
          description: "写入指定文件路径指定内容,如果文件不存在则创建该文件",
          parameters: {
            type: "object",
            properties: {
              filePath:{
                type: "string",
                description: "指定文件的绝对路径"
              },
              fileData:{
                type: "string",
                description: "想要写入的内容"
              }
            },
            required:["filePath","fileData"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "getCurrentFilePath",
          description: "获取当前活动编辑器中打开文件的绝对路径",
          parameters: {
            type: "object",
            properties: {},
            required:[]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "getAllOpenFiles",
          description: "获取当前所有打开文件的绝对路径列表",
          parameters: {
            type: "object",
            properties: {},
            required:[]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "getCurrentSelection",
          description: "获取当前选中的文本内容及其位置信息",
          parameters: {
            type: "object",
            properties: {},
            required:[]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "getCurrentLineContent",
          description: "获取当前光标所在行的完整内容",
          parameters: {
            type: "object",
            properties: {},
            required:[]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "getCursorInfo",
          description: "获取当前光标的位置信息(行号、列号、总行数)",
          parameters: {
            type: "object",
            properties: {},
            required:[]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "openFileToEdit",
          description: "在编辑器中打开指定路径的文件",
          parameters: {
            type: "object",
            properties: {
              filePath:{
                type: "string",
                description: "要打开的文件的绝对路径"
              }
            },
            required:["filePath"]
          }
      }
  }
]