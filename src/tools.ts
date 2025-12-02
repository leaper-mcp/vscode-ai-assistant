import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 工具方法实现
export const toolHandlers:{[key:string]:Function} = {
    getProjectPath: async (): Promise<string> => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return workspaceFolders[0].uri.fsPath;
        }
        throw new Error('没有打开的工作区');
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

    openFileToEdit: async (params: { path: string }): Promise<string> => {
        try {
            const uri = vscode.Uri.file(params.path);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            return `文件已打开: ${params.path}`;
        } catch (error) {
            throw new Error(`打开文件失败: ${error}`);
        }
    },

    // vscode.workspace.fs 方法实现
    fsReadFile: async (params: { path: string }): Promise<string> => {
        try {
            const uri = vscode.Uri.file(params.path);
            const uint8Array = await vscode.workspace.fs.readFile(uri);
            return new TextDecoder().decode(uint8Array);
        } catch (error) {
            throw new Error(`VSCode FS 读取文件失败: ${error}`);
        }
    },

    fsWriteFile: async (params: { path: string; content: string }): Promise<string> => {
        try {
            // 询问用户是否确认修改
            const answer = await vscode.window.showQuickPick(['是', '否'], {
                placeHolder: `确定要修改文件 ${params.path} 吗？`
            });
            
            if (answer !== '是') {
                throw new Error('用户拒绝修改');
            }

            const uri = vscode.Uri.file(params.path);
            const uint8Array = new TextEncoder().encode(params.content);
            await vscode.workspace.fs.writeFile(uri, uint8Array);
            return `VSCode FS 文件已成功写入: ${params.path}`;
        } catch (error) {
            throw new Error(`VSCode FS 写入文件失败: ${error}`);
        }
    },

    fsDelete: async (params: { path: string; recursive?: boolean }): Promise<string> => {
        try {
            // 询问用户是否确认删除
            const answer = await vscode.window.showQuickPick(['是', '否'], {
                placeHolder: `确定要删除 ${params.path} 吗？`
            });
            
            if (answer !== '是') {
                throw new Error('用户拒绝删除');
            }

            const uri = vscode.Uri.file(params.path);
            const options = { recursive: params.recursive || false };
            await vscode.workspace.fs.delete(uri, options);
            return `VSCode FS 文件/目录已成功删除: ${params.path}`;
        } catch (error) {
            throw new Error(`VSCode FS 删除失败: ${error}`);
        }
    },

    fsRename: async (params: { oldPath: string; newPath: string }): Promise<string> => {
        try {
            const oldUri = vscode.Uri.file(params.oldPath);
            const newUri = vscode.Uri.file(params.newPath);
            await vscode.workspace.fs.rename(oldUri, newUri);
            return `VScode FS 文件/目录已成功重命名: ${params.oldPath} -> ${params.newPath}`;
        } catch (error) {
            throw new Error(`VSCode FS 重命名失败: ${error}`);
        }
    },

    fsCreateDirectory: async (params: { path: string }): Promise<string> => {
        try {
            const uri = vscode.Uri.file(params.path);
            await vscode.workspace.fs.createDirectory(uri);
            return `VSCode FS 目录已成功创建: ${params.path}`;
        } catch (error) {
            throw new Error(`VSCode FS 创建目录失败: ${error}`);
        }
    },

    fsReadDirectory: async (params: { path: string }): Promise<Array<{ name: string; type: 'file' | 'directory' }>> => {
        try {
            const uri = vscode.Uri.file(params.path);
            const entries = await vscode.workspace.fs.readDirectory(uri);
            return entries.map(([name, type]) => ({
                name,
                type: type === vscode.FileType.File ? 'file' : 'directory'
            }));
        } catch (error) {
            throw new Error(`VSCode FS 读取目录失败: ${error}`);
        }
    },

    fsStat: async (params: { path: string }): Promise<{
        type: 'file' | 'directory' | 'symbolicLink' | 'unknown';
        ctime: number;
        mtime: number;
        size: number;
    }> => {
        try {
            const uri = vscode.Uri.file(params.path);
            const stat = await vscode.workspace.fs.stat(uri);
            return {
                type: stat.type === vscode.FileType.File ? 'file' :
                       stat.type === vscode.FileType.Directory ? 'directory' :
                       stat.type === vscode.FileType.SymbolicLink ? 'symbolicLink' : 'unknown',
                ctime: stat.ctime,
                mtime: stat.mtime,
                size: stat.size
            };
        } catch (error) {
            throw new Error(`VSCode FS 获取文件状态失败: ${error}`);
        }
    },

    fsCopy: async (params: { source: string; destination: string }): Promise<string> => {
        try {
            const sourceUri = vscode.Uri.file(params.source);
            const destUri = vscode.Uri.file(params.destination);
            await vscode.workspace.fs.copy(sourceUri, destUri);
            return `VSCode FS 文件/目录已成功复制: ${params.source} -> ${params.destination}`;
        } catch (error) {
            throw new Error(`VSCode FS 复制失败: ${error}`);
        }
    },
    fsEditFile: async (params: { 
        path: string; 
        edits: Array<{ oldText: string; newText: string }>;
        dryRun?: boolean;
    }): Promise<string> => {
        try {
            // 询问用户是否确认编辑
            const answer = await vscode.window.showQuickPick(['是', '否'], {
                placeHolder: `确定要编辑文件 ${params.path} 吗？`
            });
            
            if (answer !== '是') {
                throw new Error('用户拒绝了编辑');
            }
            const uri = vscode.Uri.file(params.path);
            const document = await vscode.workspace.openTextDocument(uri);
            
            if (params.dryRun) {
                let result = `预览模式 - 将对文件 ${params.path} 进行以下修改：${os.EOL}`;
                
                for (let i = 0; i < params.edits.length; i++) {
                    const edit = params.edits[i];
                    const lines = document.getText().split(os.EOL);
                    
                    // 查找匹配的文本
                    let found = false;
                    let contextStart = -1;
                    let contextEnd = -1;
                    
                    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                        const lineText = lines[lineIndex];
                        if (lineText.includes(edit.oldText)) {
                            found = true;
                            contextStart = Math.max(0, lineIndex - 2);
                            contextEnd = Math.min(lines.length - 1, lineIndex + 2);
                            break;
                        }
                    }
                    
                    if (found) {
                        result += `修改 ${i + 1}${os.EOL}`;
                        result += `原文本: "${edit.oldText}${os.EOL}`;
                        result += `新文本: "${edit.newText}${os.EOL}`;
                        result += `上下文 (行 ${contextStart + 1}-${contextEnd + 1})${os.EOL}`;
                        for (let j = contextStart; j <= contextEnd; j++) {
                            const prefix = lines[j].includes(edit.oldText) ? '>' : ' ';
                            result += `${prefix} ${j + 1}: ${lines[j]}${os.EOL}`;
                        }
                        result += os.EOL;
                    } else {
                        result += `修改 ${i + 1}: 未找到匹配的文本 "${edit.oldText}"${os.EOL}`;
                    }
                }
                
                return result;
            } else {
                // 应用修改
                await vscode.window.showTextDocument(document);
                const editor = vscode.window.activeTextEditor;
                
                if (!editor) {
                    throw new Error('无法打开编辑器');
                }

                let appliedCount = 0;
                for (const edit of params.edits) {
                    const document = editor.document;
                    const text = document.getText();
                    
                    if (text.includes(edit.oldText)) {
                        // 查找所有匹配的位置
                        let startIndex = 0;
                        let matchIndex;
                        while ((matchIndex = text.indexOf(edit.oldText, startIndex)) !== -1) {
                            const startPos = document.positionAt(matchIndex);
                            const endPos = document.positionAt(matchIndex + edit.oldText.length);
                            const range = new vscode.Range(startPos, endPos);
                            
                            await editor.edit(editBuilder => {
                                editBuilder.replace(range, edit.newText);
                            });
                            
                            appliedCount++;
                            startIndex = matchIndex + edit.newText.length;
                            break; // 只替换第一个匹配
                        }
                    }
                }
                
                await document.save();
                return `文件 ${params.path} 已成功应用 ${appliedCount} 个修改`;
            }
        } catch (error) {
            throw new Error(`编辑文件失败: ${error}`);
        }
    },
    fsSearchFiles: async (params: { 
        path: string; 
        pattern: string; 
        excludePatterns?: string[];
    }): Promise<string[]> => {
        try {
            const baseUri = vscode.Uri.file(params.path);
            const matches: string[] = [];
            const excludeRegexps = params.excludePatterns?.map(pattern => 
                new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i')
            ) || [];

            const searchPattern = params.pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
            const searchRegex = new RegExp(searchPattern, 'i');

            const searchDirectory = async (uri: vscode.Uri): Promise<void> => {
                try {
                    const entries = await vscode.workspace.fs.readDirectory(uri);
                    
                    for (const [name, type] of entries) {
                        const fullPath = vscode.Uri.joinPath(uri, name);
                        const fullPathString = fullPath.fsPath;
                        
                        // 检查排除模式
                        const isExcluded = excludeRegexps.some(regex => 
                            regex.test(name) || regex.test(fullPathString)
                        );
                        
                        if (isExcluded) {
                            continue;
                        }
                        
                        if (type === vscode.FileType.Directory) {
                            await searchDirectory(fullPath);
                        } else if (type === vscode.FileType.File) {
                            if (searchRegex.test(name)) {
                                matches.push(fullPathString);
                            }
                        }
                    }
                } catch (error) {
                    // 忽略无法访问的目录
                }
            };

            await searchDirectory(baseUri);
            return matches;
        } catch (error) {
            throw new Error(`搜索文件失败: ${error}`);
        }
    }
};

// 工具定义
export const tools = [
  {
      "type": "function",
      "function":{
          name: "getProjectPath",
          description: "返回当前打开的工作区的文件系统路径",
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
          name: "getCurrentFilePath",
          description: "获取当前活动编辑器中打开文件的文件系统路径",
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
          description: "获取当前所有打开文件的文件系统路径列表",
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
          description: "在编辑器中打开指定文件的文件系统路径",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "要打开文件的文件系统路径"
              }
            },
            required:["path"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsReadFile",
          description: "使用 vscode.workspace.fs API 读取文件内容",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "文件的文件系统路径"
              }
            },
            required:["path"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsWriteFile",
          description: "使用 vscode.workspace.fs API 写入文件内容",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "文件的文件系统路径"
              },
              content:{
                type: "string",
                description: "要写入的文件内容"
              }
            },
            required:["path","content"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsDelete",
          description: "使用 vscode.workspace.fs API 删除文件或目录",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "要删除的文件或目录的文件系统路径"
              },
              recursive:{
                type: "boolean",
                description: "是否递归删除目录（可选，默认为 false）"
              }
            },
            required:["path"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsRename",
          description: "使用 vscode.workspace.fs API 重命名文件或目录",
          parameters: {
            type: "object",
            properties: {
              oldPath:{
                type: "string",
                description: "原文件或目录的文件系统路径"
              },
              newPath:{
                type: "string",
                description: "新文件或目录的文件系统路径"
              }
            },
            required:["oldPath","newPath"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsCreateDirectory",
          description: "使用 vscode.workspace.fs API 创建目录",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "要创建的目录的文件系统路径"
              }
            },
            required:["path"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsReadDirectory",
          description: "使用 vscode.workspace.fs API 读取目录内容",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "目录的文件系统路径"
              }
            },
            required:["path"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsStat",
          description: "使用 vscode.workspace.fs API 获取文件或目录的状态信息",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "文件或目录的文件系统路径"
              }
            },
            required:["path"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsCopy",
          description: "使用 vscode.workspace.fs API 复制文件或目录",
          parameters: {
            type: "object",
            properties: {
              source:{
                type: "string",
                description: "源文件或目录的文件系统路径"
              },
              destination:{
                type: "string",
                description: "目标文件或目录的文件系统路径"
              }
            },
            required:["source","destination"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsEditFile",
          description: "使用高级模式匹配和格式化进行选择性编辑。功能包括：基于行的和多行内容匹配、保留缩进的空白标准化、多个同时编辑与正确定位、缩进样式检测和保留、Git风格差异输出与上下文、预览模式。",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "要编辑的文件路径"
              },
              edits:{
                type: "array",
                description: "编辑操作列表",
                items: {
                  type: "object",
                  properties: {
                    oldText: {
                      type: "string",
                      description: "要搜索的文本（可以是子字符串）"
                    },
                    newText: {
                      type: "string",
                      description: "要替换成的文本"
                    }
                  },
                  required: ["oldText", "newText"]
                }
              },
              dryRun: {
                type: "boolean",
                description: "预览更改而不应用（默认为 false）"
              }
            },
            required: ["path", "edits"]
          }
      }
  },
  {
      "type": "function",
      "function":{
          name: "fsSearchFiles",
          description: "递归搜索文件和目录，支持大小写不敏感匹配和排除模式",
          parameters: {
            type: "object",
            properties: {
              path:{
                type: "string",
                description: "起始目录路径"
              },
              pattern:{
                type: "string",
                description: "搜索模式，支持通配符 (* 和 ?)"
              },
              excludePatterns:{
                type: "array",
                description: "排除模式数组，支持 Glob 格式",
                items: {
                  type: "string"
                }
              }
            },
            required: ["path", "pattern"]
          }
      }
  }
]