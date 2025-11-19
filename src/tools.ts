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
]