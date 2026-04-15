const fs = require('fs');
const path = require('path');
const BaseTool = require('../BaseTool');
const editSessionService = require('../../services/EditSessionService');
const fileStateService = require('../../services/FileStateService');
const lspService = require('../../services/LSPService');

/**
 * Enhanced SEARCH/REPLACE editor tool.
 *
 * This version includes:
 * 1. Staleness Checks (Prevents overwriting user's manual changes since the AI last read the file)
 * 2. Quote Normalization (Handles differences between straight and curly quotes)
 * 3. LSP Notifications (Notifies the IDE/LSP server that files have changed)
 */
class EditFileTool extends BaseTool {
    constructor() {
        super();
        this.name = 'edit_file';
        this.description = `Edit an existing file using precise SEARCH/REPLACE blocks. 
Instructions:
1. ALWAYS use this tool for existing files (never use write_file for edits).
2. ALWAYS use read_file first to get the current content and LINE NUMBERS.
3. Provide a 'search' block that is unique enough to match only the target section.
4. Use 'replaceAll: true' to fix patterns project-wide. 
5. This tool handles quote normalization and prevents overwriting human edits.`;
        this.parameters = {
            type: "object",
            properties: {
                edits: {
                    type: "array",
                    description: "Array of edit operations to apply",
                    items: {
                        type: "object",
                        properties: {
                            filePath: {
                                type: "string",
                                description: "Relative path of the file to edit (e.g. 'src/index.js')"
                            },
                            search: {
                                type: "string",
                                description: "Exact text block to search for and replace. Leave empty to create/overwrite the whole file."
                            },
                            replace: {
                                type: "string",
                                description: "New text to replace the search block with."
                            },
                            replaceAll: {
                                type: "boolean",
                                description: "If true, all occurrences of the search block will be replaced. Default is false.",
                                default: false
                            }
                        },
                        required: ["filePath", "search", "replace"]
                    }
                }
            },
            required: ["edits"]
        };
    }

    /**
     * Compute a single edit operation.
     */
    applyEditToContent(currentContent, search, replace, replaceAll = false) {
        if (!search || search.trim() === '') {
            return { success: true, proposedContent: replace };
        }

        // 1. Quote-normalized Search (makes search blocks more robust)
        const actualSearch = fileStateService.findActualString(currentContent, search);
        if (!actualSearch) {
            return {
                success: false,
                error: `Search block not found. Make sure the search text exactly matches content (ignoring quotes).`
            };
        }

        // 2. Preserve Quote Style in replacement text if needed
        const actualReplace = fileStateService.preserveQuoteStyle(search, actualSearch, replace);

        // 3. Apply Replace (Single or All)
        let proposedContent;
        if (replaceAll) {
            proposedContent = currentContent.split(actualSearch).join(actualReplace);
        } else {
            const idx = currentContent.indexOf(actualSearch);
            proposedContent = currentContent.slice(0, idx) + actualReplace + currentContent.slice(idx + actualSearch.length);
        }
        
        return { success: true, proposedContent };
    }

    async execute(args) {
        const { edits, rootPath } = args;

        if (!rootPath) {
            return { text: "Error: Workspace root path is not available.", data: null };
        }

        if (!edits || !Array.isArray(edits) || edits.length === 0) {
            return { text: "Error: No edits provided.", data: null };
        }

        const errors = [];
        const fileContents = new Map();
        const appliedNewStringsByFile = new Map(); // path -> string[] (for dependency guard)

        for (const edit of edits) {
            const { filePath, search, replace, replaceAll } = edit;
            if (!filePath) {
                errors.push({ filePath: '?', success: false, error: 'Missing filePath' });
                continue;
            }
            const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootPath, filePath);
            
            // SECURITY check
            const normalizedRoot = rootPath.replace(/\\/g, '/').toLowerCase();
            const normalizedTarget = absolutePath.replace(/\\/g, '/').toLowerCase();
            if (!normalizedTarget.startsWith(normalizedRoot)) {
                errors.push({ filePath, success: false, error: 'Access denied: path outside workspace' });
                continue;
            }

            // STALENESS check (Prevents overwriting user's manual changes)
            if (fs.existsSync(absolutePath) && fileStateService.isStale(absolutePath)) {
                errors.push({
                    filePath,
                    success: false,
                    error: `File has been modified since you last read it. Please read the file again to ensure you have the latest version before editing.`
                });
                continue;
            }

            const currentContent = fileContents.has(absolutePath)
                ? fileContents.get(absolutePath)
                : (fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf-8') : '');

            // BATCH DEPENDENCY GUARD: Check if search string is inside a previously applied new string
            // This prevents overlapping edits that can corrupt the code.
            const appliedStrings = appliedNewStringsByFile.get(absolutePath) || [];
            const searchToCheck = (search || '').trim();
            if (searchToCheck !== '') {
                const overlaps = appliedStrings.some(prev => prev.includes(searchToCheck));
                if (overlaps) {
                    errors.push({
                        filePath,
                        success: false,
                        error: `Overlap detected: Your search block is part of a replacement you just made in this same batch. Try merging your edits or use a more specific search block.`
                    });
                    continue;
                }
            }

            // WHITESPACE STRIPPING: Clean up trailing whitespace unless it's a markdown/text file semantically
            const isMarkdown = filePath.endsWith('.md') || filePath.endsWith('.mdx');
            const actualReplace = isMarkdown ? replace : fileStateService.stripTrailingWhitespace(replace);

            const patchResult = this.applyEditToContent(currentContent, search || '', actualReplace || '', replaceAll);
            if (!patchResult.success) {
                errors.push({ filePath, success: false, error: patchResult.error });
                continue;
            }

            fileContents.set(absolutePath, patchResult.proposedContent);
            
            // Track applied strings for dependency guard
            if (!appliedNewStringsByFile.has(absolutePath)) appliedNewStringsByFile.set(absolutePath, []);
            appliedNewStringsByFile.get(absolutePath).push(actualReplace);
        }

        const proposedByFile = {};
        for (const [absolutePath, proposedContent] of fileContents.entries()) {
            proposedByFile[absolutePath] = proposedContent;
            
            // LSP Notification: Notify change (theoretical)
            lspService.notifyFileChanged(absolutePath, proposedContent);
        }

        const session = editSessionService.createSession({ rootPath, proposedByFile });
        
        // After physical write in createSession, notify save
        for (const absolutePath of Object.keys(proposedByFile)) {
            lspService.notifyFileSaved(absolutePath);
            fileStateService.recordWrite(absolutePath);
        }

        const results = [...session.files, ...errors];

        // Build summary text
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        let text = '';
        for (const r of results) {
            if (r.success) {
                const added = (r.hunks || []).reduce((n, h) => n + (h.added?.length || 0), 0);
                const removed = (r.hunks || []).reduce((n, h) => n + (h.removed?.length || 0), 0);
                const tag = r.action === 'created' ? 'CREATED' : `EDITED (+${added} -${removed} lines)`;
                text += `✓ ${tag}: ${r.relativePath || r.filePath}\n`;
            } else {
                text += `✗ FAILED: ${r.relativePath || r.filePath} — ${r.error}\n`;
            }
        }

        if (failCount > 0) {
            text += `\n${failCount} edit(s) failed. The failed edits were NOT applied.`;
        }

        return {
            text: text.trim(),
            data: {
                results,
                successCount,
                failCount,
                sessionId: session.sessionId
            }
        };
    }
}

module.exports = EditFileTool;
