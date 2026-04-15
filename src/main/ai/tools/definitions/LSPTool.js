const BaseTool = require('../BaseTool');
const lspService = require('../../services/LSPService');
const path = require('path');

/**
 * Tool for code intelligence operations using LSP (Language Server Protocol).
 * 
 * Supports operations like:
 * - goToDefinition: Find where a symbol is defined.
 * - findReferences: List all places where a symbol is used.
 * - hover: Get documentation/type info for a symbol.
 * - documentSymbol: List all classes, methods, and variables in a file.
 * - workspaceSymbol: Search for symbols across the entire project.
 */
class LSPTool extends BaseTool {
    constructor() {
        super();
        this.name = 'lsp_query';
        this.description = 'Perform code intelligence operations (definitions, references, symbols, hover) using the Language Server Protocol.';
        this.parameters = {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    enum: [
                        'goToDefinition',
                        'findReferences',
                        'hover',
                        'documentSymbol',
                        'workspaceSymbol',
                        'goToImplementation'
                    ],
                    description: "The LSP operation to perform"
                },
                filePath: {
                    type: "string",
                    description: "The relative path to the file"
                },
                line: {
                    type: "number",
                    description: "The line number (1-based)"
                },
                character: {
                    type: "number",
                    description: "The character offset (1-based)"
                }
            },
            required: ["operation", "filePath"]
        };
    }

    async execute(args) {
        const { operation, filePath, line, character, rootPath } = args;

        if (!rootPath) {
            return { text: "Error: Workspace root path is not available.", data: null };
        }

        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootPath, filePath);

        try {
            // Forward request to LSPService
            const result = await lspService.performOperation(operation, absolutePath, line, character, rootPath);

            return {
                text: `LSP Result for ${operation} on ${filePath}:\n\n${result.result}`,
                data: result
            };
        } catch (error) {
            console.error('[LSPTool] Error:', error);
            return { text: `Error performing LSP operation: ${error.message}`, data: null };
        }
    }
}

module.exports = LSPTool;
