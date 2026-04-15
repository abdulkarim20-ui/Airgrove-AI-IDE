const path = require('path');
const { spawn } = require('child_process');

/**
 * Enhanced LSPService for managing Language Server Protocol backends.
 * Handles server lifecycle, JSON-RPC messaging, and common server configurations.
 */
class LSPService {
    constructor() {
        this.servers = new Map(); // extension -> serverProcess
        this.capabilities = new Map(); // extension -> capabilities
        this.nextRequestId = 1;
        this.pendingRequests = new Map(); // id -> { resolve, reject }
        
        const isWindows = process.platform === 'win32';
        const tsServer = isWindows ? 'typescript-language-server.cmd' : 'typescript-language-server';
        const pyServer = isWindows ? 'pyright-langserver.cmd' : 'pyright-langserver';
        const jsonServer = isWindows ? 'vscode-json-languageserver.cmd' : 'vscode-json-languageserver';

        // Configuration for common language servers
        this.serverConfigs = {
            '.js': { command: tsServer, args: ['--stdio'] },
            '.ts': { command: tsServer, args: ['--stdio'] },
            '.py': { command: pyServer, args: ['--stdio'] },
            '.json': { command: jsonServer, args: ['--stdio'] }
        };
    }

    /**
     * Start an LSP server for a given file extension if not already running.
     */
    async ensureServerRunning(ext, rootPath) {
        if (this.servers.has(ext)) return true;

        const config = this.serverConfigs[ext];
        if (!config) return false;

        try {
            console.log(`[LSPService] Starting ${config.command} for ${ext}...`);
            const server = spawn(config.command, config.args, {
                cwd: rootPath,
                shell: true,
                stdio: ['pipe', 'pipe', 'inherit']
            });

            server.on('error', (err) => {
                console.error(`[LSPService] Server error (${ext}):`, err);
                this.servers.delete(ext);
            });

            server.on('exit', (code) => {
                console.log(`[LSPService] Server exited (${ext}) with code ${code}`);
                this.servers.delete(ext);
            });

            // Handle incoming messages
            let buffer = '';
            server.stdout.on('data', (data) => {
                buffer += data.toString();
                this._processBuffer(buffer, ext);
            });

            this.servers.set(ext, server);

            // Send initialization request
            await this._sendRequest(server, 'initialize', {
                processId: process.pid,
                rootPath: rootPath,
                rootUri: `file://${rootPath}`,
                capabilities: {
                    textDocument: {
                        definition: { dynamicRegistration: true },
                        hover: { contentFormat: ['markdown', 'plaintext'] },
                        references: { dynamicRegistration: true }
                    }
                }
            });

            this._sendNotification(server, 'initialized', {});
            console.log(`[LSPService] ${config.command} initialized for ${ext}`);
            return true;
        } catch (error) {
            console.error(`[LSPService] Failed to start server for ${ext}:`, error);
            return false;
        }
    }

    /**
     * Perform an LSP operation.
     */
    async performOperation(operation, filePath, line, character, rootPath) {
        const ext = path.extname(filePath);
        const started = await this.ensureServerRunning(ext, rootPath);

        if (!started) {
            return {
                operation,
                result: `LSP server for ${ext} is not configured or not installed (tried ${this.serverConfigs[ext]?.command || 'none'}).`,
                filePath
            };
        }

        const server = this.servers.get(ext);
        const params = {
            textDocument: { uri: `file://${filePath}` },
            position: { line: line - 1, character: character - 1 }
        };

        let method = '';
        switch (operation) {
            case 'goToDefinition': method = 'textDocument/definition'; break;
            case 'findReferences': method = 'textDocument/references'; params.context = { includeDeclaration: true }; break;
            case 'hover': method = 'textDocument/hover'; break;
            default: return { operation, result: `Unknown operation: ${operation}`, filePath };
        }

        try {
            const response = await this._sendRequest(server, method, params);
            return {
                operation,
                result: this._formatResponse(operation, response),
                data: response
            };
        } catch (error) {
            return { operation, result: `LSP Error: ${error.message}`, filePath };
        }
    }

    /**
     * Notify LSP servers that a file has been modified.
     */
    async notifyFileChanged(absolutePath, content) {
        const ext = path.extname(absolutePath);
        const server = this.servers.get(ext);
        if (server) {
            this._sendNotification(server, 'textDocument/didChange', {
                textDocument: { uri: `file://${absolutePath}`, version: Date.now() },
                contentChanges: [{ text: content }]
            });
        }
    }

    /**
     * Notify LSP servers that a file has been saved to disk.
     */
    async notifyFileSaved(absolutePath) {
        const ext = path.extname(absolutePath);
        const server = this.servers.get(ext);
        if (server) {
            this._sendNotification(server, 'textDocument/didSave', {
                textDocument: { uri: `file://${absolutePath}` }
            });
        }
    }

    /**
     * Helper to send JSON-RPC requests.
     */
    _sendRequest(server, method, params) {
        return new Promise((resolve, reject) => {
            const id = this.nextRequestId++;
            this.pendingRequests.set(id, { resolve, reject });

            const msg = JSON.stringify({
                jsonrpc: '2.0',
                id,
                method,
                params
            });
            this._writeToStream(server.stdin, msg);
        });
    }

    /**
     * Helper to send JSON-RPC notifications.
     */
    _sendNotification(server, method, params) {
        const msg = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params
        });
        this._writeToStream(server.stdin, msg);
    }

    _writeToStream(stdin, msg) {
        const header = `Content-Length: ${Buffer.byteLength(msg, 'utf8')}\r\n\r\n`;
        stdin.write(header + msg, 'utf8');
    }

    _processBuffer(buffer, ext) {
        // Very basic JSON-RPC parser - in production use a more robust one
        while (buffer.includes('\r\n\r\n')) {
            const headerMatch = buffer.match(/Content-Length: (\d+)/);
            if (!headerMatch) break;

            const length = parseInt(headerMatch[1], 10);
            const bodyStart = buffer.indexOf('\r\n\r\n') + 4;

            if (buffer.length < bodyStart + length) break;

            const body = buffer.slice(bodyStart, bodyStart + length);
            buffer = buffer.slice(bodyStart + length);

            try {
                const response = JSON.parse(body);
                if (response.id && this.pendingRequests.has(response.id)) {
                    const { resolve, reject } = this.pendingRequests.get(response.id);
                    this.pendingRequests.delete(response.id);
                    if (response.error) reject(new Error(response.error.message));
                    else resolve(response.result);
                }
            } catch (e) {
                console.error(`[LSPService] Parse error (${ext}):`, e);
            }
        }
    }

    _formatResponse(operation, response) {
        if (!response) return "No result found.";
        
        if (operation === 'hover') {
            const contents = response.contents;
            if (Array.isArray(contents)) return contents.map(c => typeof c === 'string' ? c : c.value).join('\n');
            if (typeof contents === 'string') return contents;
            return contents.value || "No documentation available.";
        }

        if (Array.isArray(response)) {
            return response.map(loc => {
                const uri = loc.uri || loc.targetUri;
                const range = loc.range || loc.targetSelectionRange;
                return `${path.basename(decodeURIComponent(uri))}:${range.start.line + 1}:${range.start.character + 1}`;
            }).join('\n');
        }

        if (response.uri || response.targetUri) {
            const uri = response.uri || response.targetUri;
            const range = response.range || response.targetSelectionRange;
            return `${path.basename(decodeURIComponent(uri))}:${range.start.line + 1}:${range.start.character + 1}`;
        }

        return JSON.stringify(response, null, 2);
    }
}

module.exports = new LSPService();
