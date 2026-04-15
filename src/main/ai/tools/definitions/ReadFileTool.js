const fs = require('fs');
const path = require('path');
const BaseTool = require('../BaseTool');
const { parseDocument } = require('../../parsers/DocumentParser');
const fileStateService = require('../../services/FileStateService');

// Binary extensions to block immediately (Common in IDEs)
const BINARY_EXTENSIONS = new Set([
     '.exe', '.bin', '.dll', '.so', '.dylib', '.lib', '.a', '.obj',
     '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
     '.zip', '.tar', '.gz', '.7z', '.rar',
     '.mp3', '.mp4', '.wav', '.avi', '.mov',
     '.pyc', '.pyo', '.pyd', '.class'
]);

// Extensions that need a dedicated document parser (not plain utf-8)
const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.pptx', '.ppt']);

/**
 * Reads the entire content of a file.
 * Automatically handles plain-text, PDF, Word (.doc/.docx),
 * and PowerPoint (.ppt/.pptx) via DocumentParser.
 */
class ReadFileTool extends BaseTool {
    constructor() {
        super();
        this.name = 'read_file';
        this.description =
            'Read the content of a file. Supports LINE NUMBERS, OFFSET, and LIMIT. ' +
            'Use this before editing to get precise line numbers for your search blocks. ' +
            'Automatically handles Source Code, PDFs, and Word documents.';
        this.parameters = {
            type: 'object',
            properties: {
                filePath: {
                    type: 'string',
                    description: "The relative path of the file to read (e.g. 'src/index.js' or 'docs/report.pdf')"
                },
                offset: {
                    type: 'number',
                    description: "The line number to start reading from (1-indexed). Optional."
                },
                limit: {
                    type: 'number',
                    description: "The number of lines to read. Optional."
                }
            },
            required: ['filePath']
        };
    }

    async execute(args) {
        const { filePath, offset = 1, limit = 500, rootPath } = args;

        if (!rootPath) {
            return { text: 'Error: Workspace root path is not available.', data: null };
        }

        if (!filePath) {
            return { text: 'Error: No filePath provided.', data: null };
        }

        try {
            const absolutePath = path.isAbsolute(filePath)
                ? filePath
                : path.join(rootPath, filePath);

            // SECURITY: Ensure path is inside workspace
            const normalAbs = absolutePath.replace(/\\/g, '/');
            const lowerPath = normalAbs.toLowerCase();
            const normalRoot = rootPath.replace(/\\/g, '/');
            if (!lowerPath.includes(normalRoot.toLowerCase())) {
                return { text: `Error: Access denied. Path is outside workspace: ${filePath}`, data: null };
            }

            if (!fs.existsSync(absolutePath)) {
                // Try to find a similar file
                const dir = path.dirname(absolutePath);
                const filename = path.basename(absolutePath).toLowerCase();
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    const match = files.find(f => f.toLowerCase() === filename);
                    if (match) {
                        return { text: `Error: File not found: ${filePath}. Did you mean '${path.join(path.dirname(filePath), match)}'?`, data: null };
                    }
                }
                return { text: `Error: File not found: ${filePath}`, data: null };
            }

            // 1. BINARY DETECTION: Check extension
            const ext = path.extname(absolutePath).toLowerCase();
            if (BINARY_EXTENSIONS.has(ext)) {
                return { text: `Error: Cannot read binary file '${filePath}'. Use appropriate tools for binary analysis or images.`, data: null };
            }

            // 2. BINARY DETECTION: Content sniffing (null byte check)
            if (this._isBinaryContent(absolutePath)) {
                return { text: `Error: Detected binary content in '${filePath}'. Skipping for safety.`, data: null };
            }

            // 3. DEDUPLICATION (TOKEN SAVING): Check cache
            const state = fileStateService.getState(absolutePath);
            if (state && !fileStateService.isStale(absolutePath)) {
                const sameRange = state.lastReadOffset === offset && state.lastReadLimit === limit;
                if (sameRange) {
                    return { 
                        text: `[FILE: ${filePath} UNCHANGED]\n(File has not been modified since last read. Using cached context to save tokens.)`,
                        data: { filePath, fileUnchanged: true } 
                    };
                }
            }

            const stat = fs.statSync(absolutePath);
            if (stat.isDirectory()) {
                return { text: `Error: '${filePath}' is a directory, not a file.`, data: null };
            }

            // Use the document parser
            const fullContent = await parseDocument(absolutePath);
            const allLines = fullContent.split(/\r?\n/);
            const totalLines = allLines.length;

            // Apply Offset and Limit
            let start = Math.max(0, offset - 1);
            let end = limit ? Math.min(totalLines, start + limit) : totalLines;
            
            // Safety: Cap reading
            const MAX_LINES = 1000; 
            if (!limit && (end - start) > MAX_LINES) {
                end = start + MAX_LINES;
            }

            const linesToReturn = allLines.slice(start, end);
            const contentWithNumbers = linesToReturn.map((line, i) => {
                const lineNum = start + i + 1;
                return `${lineNum}: ${line}`;
            }).join('\n');

            const isTruncated = (end - start) < totalLines;
            const displayStart = start + 1;
            const displayEnd = end;
            const rangeDisplay = (displayStart === displayEnd) ? `#${displayStart}` : `#${displayStart}-${displayEnd}`;

            // Record the read for caching
            fileStateService.recordRead(absolutePath, offset, limit);

            let textOutput = `[FILE: ${filePath} ${rangeDisplay}]\n`;
            if (isTruncated) {
                textOutput += `(Showing ${end - start} of ${totalLines} lines. Use offset/limit for more)\n`;
            }
            textOutput += `\n${contentWithNumbers}`;

            return {
                text: textOutput,
                data: { 
                    filePath, totalLines, startLine: displayStart, endLine: displayEnd, 
                    isPartial: isTruncated, rangeDisplay 
                }
            };
        } catch (error) {
            console.error('[ReadFileTool] Error:', error);
            return { text: `Error reading file: ${error.message}`, data: null };
        }
    }

    _isBinaryContent(absolutePath) {
        try {
            const buffer = Buffer.alloc(8192);
            const fd = fs.openSync(absolutePath, 'r');
            const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
            fs.closeSync(fd);
            for (let i = 0; i < bytesRead; i++) {
                if (buffer[i] === 0) return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }
}

module.exports = ReadFileTool;
