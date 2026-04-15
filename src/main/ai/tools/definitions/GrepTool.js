const fs = require('fs');
const path = require('path');
const readline = require('readline');
const BaseTool = require('../BaseTool');

/**
 * GrepTool - Lightning fast file content search, mirroring Claude's power.
 * Supports Regex, Context lines, Pagination, and various output modes.
 */
class GrepTool extends BaseTool {
    constructor() {
        super();
        this.name = 'grep_tool';
        this.description = 'Search through file contents in the project using regular expressions. Powerful for finding function definitions, variable usages, or specific code patterns across the whole project.';
        this.parameters = {
            type: "object",
            properties: {
                pattern: { 
                    type: "string", 
                    description: "The regular expression pattern to search for in file contents" 
                },
                path: {
                    type: "string",
                    description: "File or directory to search in. Defaults to workspace root."
                },
                glob: {
                    type: "string",
                    description: "Glob pattern to filter files (e.g. '*.js', 'src/**/*.css')."
                },
                output_mode: {
                    type: "string",
                    enum: ["content", "files_with_matches", "count"],
                    description: "Output mode: 'content' shows matching lines, 'files_with_matches' shows only file paths, 'count' shows match counts per file. Defaults to 'files_with_matches'."
                },
                case_insensitive: {
                    type: "boolean",
                    description: "Whether to perform a case-insensitive search. Defaults to false."
                },
                context: {
                    type: "number",
                    description: "Number of lines to show before and after each match (rg -C). Only for 'content' mode."
                },
                head_limit: {
                    type: "number",
                    description: "Limit the number of results returned (pagination). Defaults to 100."
                },
                offset: {
                    type: "number",
                    description: "Skip the first N results (pagination). Defaults to 0."
                }
            },
            required: ["pattern"]
        };

        this.IGNORED_DIRS = new Set([
            'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'out', 'target', 'bin', 'obj', 'vendor', '__pycache__', '.next'
        ]);
    }

    async execute(args) {
        const { 
            pattern, 
            path: searchPath, 
            glob, 
            output_mode = "files_with_matches", 
            case_insensitive = false,
            context = 0,
            head_limit = 100,
            offset = 0,
            rootPath 
        } = args;

        if (!rootPath) {
            return { text: "Error: Workspace root path is not available.", data: null };
        }

        try {
            const targetDir = searchPath ? (path.isAbsolute(searchPath) ? searchPath : path.join(rootPath, searchPath)) : rootPath;
            
            // SECURITY: Ensure path is inside workspace
            const normalizedRoot = rootPath.replace(/\\/g, '/').toLowerCase();
            const normalizedTarget = targetDir.replace(/\\/g, '/').toLowerCase();
            if (!normalizedTarget.startsWith(normalizedRoot)) {
                return { text: `Error: Access denied. Path is outside workspace.`, data: null };
            }

            if (!fs.existsSync(targetDir)) {
                return { text: `Error: Path does not exist: ${searchPath || '.'}`, data: null };
            }

            // Prepare Regex
            const regexFlags = case_insensitive ? 'gi' : 'g';
            const searchRegex = new RegExp(pattern, regexFlags);

            // Prepare Glob filter
            let globRegex = null;
            if (glob) {
                globRegex = this.globToRegex(glob);
            }

            const results = [];
            const files = this.walk(targetDir, globRegex);

            let matchesCount = 0;
            let filesWithMatches = 0;

            for (const file of files) {
                const relativePath = path.relative(rootPath, file).replace(/\\/g, '/');
                const fileMatches = await this.searchInFile(file, searchRegex, context, output_mode);

                if (fileMatches.length > 0) {
                    filesWithMatches++;
                    if (output_mode === 'files_with_matches') {
                        results.push({ path: relativePath });
                    } else if (output_mode === 'count') {
                        const count = fileMatches.length;
                        matchesCount += count;
                        results.push({ path: relativePath, count });
                    } else {
                        // content mode
                        fileMatches.forEach(m => {
                            m.path = relativePath;
                            results.push(m);
                        });
                    }
                }
            }

            // Apply pagination
            const paginatedResults = results.slice(offset, offset + head_limit);
            const total = results.length;

            if (total === 0) {
                return { text: `No matches found for pattern: "${pattern}"`, data: [] };
            }

            // Format output based on mode
            let outputText = `Search Results for "${pattern}" (${total} total):\n`;
            if (output_mode === "files_with_matches") {
                outputText += paginatedResults.map(r => `- ${r.path}`).join('\n');
            } else if (output_mode === "count") {
                outputText += paginatedResults.map(r => `- ${r.path}: ${r.count} matches`).join('\n');
            } else {
                // content mode
                outputText += paginatedResults.map(r => {
                    let matchBlock = `--- ${r.path}:${r.lineNum} ---\n`;
                    if (r.before && r.before.length > 0) matchBlock += r.before.join('\n') + '\n';
                    matchBlock += `>> ${r.lineNum}: ${r.line}\n`;
                    if (r.after && r.after.length > 0) matchBlock += r.after.join('\n') + '\n';
                    return matchBlock;
                }).join('\n');
            }

            if (total > offset + head_limit) {
                outputText += `\n\n[... showing ${head_limit} of ${total} results. Use offset/limit for more]`;
            }

            return { 
                text: outputText, 
                data: {
                    results: paginatedResults,
                    total,
                    offset,
                    limit: head_limit,
                    mode: output_mode
                }
            };

        } catch (error) {
            console.error('[GrepTool] Error:', error);
            return { text: `Error searching contents: ${error.message}`, data: null };
        }
    }

    async searchInFile(filePath, regex, contextLines, mode) {
        const matches = [];
        const lines = [];
        
        try {
            // Buffer-based check for binary to avoid reading large binaries
            const buffer = Buffer.alloc(1024);
            const fd = fs.openSync(filePath, 'r');
            const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
            fs.closeSync(fd);
            for (let i = 0; i < bytesRead; i++) {
                if (buffer[i] === 0) return []; // Binary file
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const allLines = content.split(/\r?\n/);

            for (let i = 0; i < allLines.length; i++) {
                const line = allLines[i];
                if (regex.test(line)) {
                    // reset lastIndex because of 'g' flag
                    regex.lastIndex = 0;

                    if (mode === 'files_with_matches') {
                        return [true]; // Just need to know it has matches
                    }

                    if (mode === 'count') {
                        matches.push(true);
                        continue;
                    }

                    // Content mode: Collect context
                    const startBefore = Math.max(0, i - contextLines);
                    const endAfter = Math.min(allLines.length - 1, i + contextLines);

                    matches.push({
                        lineNum: i + 1,
                        line: line.trim(),
                        before: allLines.slice(startBefore, i),
                        after: allLines.slice(i + 1, endAfter + 1)
                    });
                }
                // reset lastIndex because of 'g' flag
                regex.lastIndex = 0;
            }
        } catch (e) {
            return [];
        }

        return matches;
    }

    walk(dir, globRegex, fileList = []) {
        try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                if (this.IGNORED_DIRS.has(item)) continue;
                const fullPath = path.join(dir, item);
                let stat;
                try {
                    stat = fs.statSync(fullPath);
                } catch (e) { continue; }

                if (stat.isDirectory()) {
                    if (item.startsWith('.')) continue;
                    this.walk(fullPath, globRegex, fileList);
                } else {
                    if (globRegex) {
                        const relative = path.relative(dir, fullPath).replace(/\\/g, '/');
                        if (globRegex.test(relative)) {
                            fileList.push(fullPath);
                        }
                    } else {
                        fileList.push(fullPath);
                    }
                }
            }
        } catch (e) {}
        return fileList;
    }

    globToRegex(glob) {
        const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        const regexString = escaped.replace(/\*\*/g, '(.+)').replace(/\*/g, '[^/]+');
        return new RegExp(`^${regexString}$`, 'i');
    }
}

module.exports = GrepTool;
