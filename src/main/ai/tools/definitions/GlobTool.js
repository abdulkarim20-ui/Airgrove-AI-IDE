const fs = require('fs');
const path = require('path');
const BaseTool = require('../BaseTool');

/**
 * GlobTool - Find files matching a name pattern or wildcard.
 * Mirroring Claude's GlobTool for high-precision file discovery.
 */
class GlobTool extends BaseTool {
    constructor() {
        super();
        this.name = 'glob_tool';
        this.description = 'Find files by name pattern or wildcard (e.g. "src/**/*.js", "index.html", "*.css"). Powerful for listing files in a specific directory or finding files with a specific extension.';
        this.parameters = {
            type: "object",
            properties: {
                pattern: { 
                    type: "string", 
                    description: "The glob pattern to match files against (e.g. 'src/**/*.js')" 
                },
                path: {
                    type: "string",
                    description: "The directory to search in. Defaults to workspace root."
                }
            },
            required: ["pattern"]
        };

        this.IGNORED_DIRS = new Set([
            'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'out', 'target', 'bin', 'obj', 'vendor', '__pycache__', '.next'
        ]);
    }

    execute(args) {
        const { pattern, path: searchPath, rootPath } = args;

        if (!rootPath) {
            return { text: "Error: Workspace root path is not available.", data: null };
        }

        if (!pattern) {
            return { text: "Error: No pattern provided.", data: null };
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
                return { text: `Error: Directory does not exist: ${searchPath || '.'}`, data: null };
            }

            const allFiles = this.walk(targetDir);
            const regex = this.globToRegex(pattern);
            
            const matches = allFiles.filter(file => {
                const relativeToRoot = path.relative(rootPath, file).replace(/\\/g, '/');
                const relativeToTarget = path.relative(targetDir, file).replace(/\\/g, '/');
                return regex.test(relativeToRoot) || regex.test(relativeToTarget) || regex.test(path.basename(file));
            });

            // Sort results to be deterministic
            matches.sort();

            const limit = 100;
            const displayMatches = matches.slice(0, limit);

            if (displayMatches.length === 0) {
                return { text: `No files found matching pattern: "${pattern}"`, data: [] };
            }

            const resultsData = displayMatches.map(fullPath => ({
                path: path.relative(rootPath, fullPath).replace(/\\/g, '/'),
                name: path.basename(fullPath)
            }));

            let outputText = `Found ${matches.length} files matching "${pattern}":\n`;
            outputText += resultsData.map(item => `- ${item.path}`).join('\n');

            if (matches.length > limit) {
                outputText += `\n\n(Results are truncated. Showing first ${limit} of ${matches.length} files. Use a more specific pattern if needed.)`;
            }

            return { text: outputText, data: resultsData };
        } catch (error) {
            console.error('[GlobTool] Error:', error);
            return { text: `Error executing glob search: ${error.message}`, data: null };
        }
    }

    globToRegex(glob) {
        // Simple but effective glob to regex converter
        const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        const regexString = escaped
            .replace(/\*\*\//g, '(.+/)?') // Handle **/
            .replace(/\*\*/g, '(.+)')     // Handle **
            .replace(/\*/g, '[^/]+')       // Handle *
            .replace(/\?/g, '[^/]');       // Handle ?
        return new RegExp(`^.*?${regexString}$`, 'i');
    }

    walk(dir, fileList = []) {
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
                    if (item.startsWith('.')) continue; // ignore hidden dirs except specified
                    this.walk(fullPath, fileList);
                } else {
                    fileList.push(fullPath);
                }
            }
        } catch (e) {}
        return fileList;
    }
}

module.exports = GlobTool;
