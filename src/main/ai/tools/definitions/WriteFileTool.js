const fs = require('fs');
const path = require('path');
const BaseTool = require('../BaseTool');
const editSessionService = require('../../services/EditSessionService');
const fileStateService = require('../../services/FileStateService');
const lspService = require('../../services/LSPService');

/**
 * Creates or overwrites a file in the workspace.
 */
class WriteFileTool extends BaseTool {
    constructor() {
        super();
        this.name = 'write_file';
        this.description = 'Create a NEW file with content. WARNING: For existing files, you MUST use edit_file instead to prevent accidental data loss. Only use write_file for completely new files.';
        this.parameters = {
            type: "object",
            properties: {
                filePath: { 
                    type: "string", 
                    description: "The relative path of the file to write (e.g. 'src/utils.js')" 
                },
                content: {
                    type: "string",
                    description: "The new content to be written into the file."
                }
            },
            required: ["filePath", "content"]
        };
    }

    async execute(args) {
        const { filePath, content, rootPath } = args;

        if (!rootPath) {
            return { text: "Error: Workspace root path is not available.", data: null };
        }

        if (!filePath) {
            return { text: "Error: No filePath provided.", data: null };
        }

        try {
            const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootPath, filePath);
            
            // SECURITY: Ensure path is inside workspace
            const normalizedRoot = rootPath.replace(/\\/g, '/').toLowerCase();
            const normalizedTarget = absolutePath.replace(/\\/g, '/').toLowerCase();
            if (!normalizedTarget.startsWith(normalizedRoot)) {
                return { text: `Error: Access denied. Path '${filePath}' is outside workspace.`, data: null };
            }

            const alreadyExists = fs.existsSync(absolutePath);

            // 1. READ MANDATE & STALENESS CHECK (Only for existing files)
            if (alreadyExists) {
                const state = fileStateService.getState(absolutePath);
                
                // Read Mandate: Refuse if never read
                if (!state) {
                    return { 
                        text: `Error: File '${filePath}' has not been read yet. You must read the file first before attempting to overwrite it to ensure you have context.`, 
                        data: { errorType: 'READ_MANDATE_VIOLATION' } 
                    };
                }

                // Staleness Check: Refuse if modified outside AI context
                if (fileStateService.isStale(absolutePath)) {
                    return { 
                        text: `Error: File '${filePath}' has been modified since your last read. Please read the file again to get the latest content before writing.`, 
                        data: { errorType: 'STALE_FILE_ERROR' } 
                    };
                }
            }

            // Create directory if it doesn't exist
            const dir = path.dirname(absolutePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            // LSP Notification: Notify change (theoretical)
            lspService.notifyFileChanged(absolutePath, content);

            // Use EditSessionService to handle the write so it's reviewable in UI
            const proposedByFile = {};
            proposedByFile[absolutePath] = content;
            const session = editSessionService.createSession({ rootPath, proposedByFile });

            // Post-write records
            lspService.notifyFileSaved(absolutePath);
            fileStateService.recordWrite(absolutePath);

            const fileResult = session.files[0];
            const added = fileResult.hunks.reduce((n, h) => n + (h.added?.length || 0), 0);
            const removed = fileResult.hunks.reduce((n, h) => n + (h.removed?.length || 0), 0);

            return { 
                text: `${alreadyExists ? 'OVERWRITTEN' : 'CREATED'}: ${filePath} (+${added} -${removed} lines)`, 
                data: { 
                    filePath: absolutePath, 
                    relativePath: filePath, 
                    added, 
                    removed, 
                    size: content.length,
                    action: alreadyExists ? 'edited' : 'created',
                    sessionId: session.sessionId
                } 
            };
        } catch (error) {
            console.error('[WriteFileTool] Error:', error);
            return { text: `Error writing file: ${error.message}`, data: null };
        }
    }
}

module.exports = WriteFileTool;
