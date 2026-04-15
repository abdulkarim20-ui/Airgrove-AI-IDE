const pty = require('node-pty');
const path = require('path');
const BaseTool = require('../BaseTool');
const { BrowserWindow } = require('electron');

/**
 * Strips ANSI/VT escape codes so the AI receives readable plain text.
 */
function stripAnsi(str) {
    // eslint-disable-next-line no-control-regex
    return str
        .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')   // CSI sequences (colors, cursor)
        .replace(/\x1B\][^\x07]*\x07/g, '')         // OSC sequences
        .replace(/\x1B[^\[\]]/g, '')                // other ESC sequences
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // stray control chars
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
}

/**
 * Returns the most actionable lines: prioritises error lines + last 20 lines.
 */
function extractErrorContext(output) {
    const lines = output.split('\n').filter(l => l.trim());
    if (lines.length <= 30) return lines.join('\n');

    const errorLines = lines.filter(l =>
        /error|exception|fail|cannot|not found|invalid|undefined|unexpected|denied|missing/i.test(l)
    );
    const tail = lines.slice(-20);
    const merged = [...new Set([...errorLines.slice(0, 12), ...tail])];
    return merged.join('\n');
}

/**
 * Executes a shell command in the project workspace.
 * Returns structured, AI-readable output including exit code & diagnosis hints.
 *
 * DESIGN: Uses -Command (without -NonInteractive) so PowerShell detects the PTY
 * as a real terminal and renders full table formatting (Mode, LastWriteTime, etc.).
 * Raw PTY bytes are forwarded to xterm.js which renders ANSI colors natively.
 * No interactive stdin → no prompt echo, no $OutputEncoding noise.
 */
class TerminalRunTool extends BaseTool {
    constructor() {
        super();
        this.name = 'terminal_run';
        this.description = [
            'Execute a shell command in the project workspace.',
            '',
            'PLATFORM: Windows — ALWAYS use PowerShell syntax.',
            'CRITICAL RULES (violations cause immediate failures):',
            '  1. Chain commands with ; not &&:   cd src; npm install',
            '  2. Variable interpolation in PS:   "Step $i" interpolates — use single quotes or escape: `$i',
            '  3. Execution policy for .ps1:      Add -ExecutionPolicy Bypass when running .ps1 scripts',
            '  4. Path separators:                Use \\\\ on Windows, not /',
            '  5. Never rerun a failed command unchanged — always diagnose first.',
            '',
            'AFTER EACH RUN:',
            '  - Read the returned exit code and full output.',
            '  - If exit code != 0: analyse the "ERROR OUTPUT" section, fix the root cause, then retry.',
            '  - If exit code == 0: proceed to the next logical step.',
        ].join('\n');

        this.parameters = {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The PowerShell command to execute. Must use Windows/PowerShell syntax.'
                },
                cwd: {
                    type: 'string',
                    description: 'Absolute path or path relative to project root. Defaults to project root.'
                }
            },
            required: ['command']
        };
    }

    async execute(args) {
        const { command, cwd, rootPath, requestId } = args;

        if (!rootPath) {
            return { text: '❌ ERROR: Workspace root path not available.', data: null };
        }

        let spawnCwd = rootPath;
        if (cwd) {
            spawnCwd = path.isAbsolute(cwd) ? cwd : path.join(rootPath, cwd);
        }
        if (process.platform === 'win32') {
            spawnCwd = path.resolve(spawnCwd);
        }

        const isWin = process.platform === 'win32';
        const shell = isWin ? 'powershell.exe' : 'bash';

        /*
         * Use -Command WITHOUT -NonInteractive.
         *
         * Why not -NonInteractive?
         *   -NonInteractive tells PS it is NOT attached to a terminal (pipe mode),
         *   which suppresses table headers and rich formatting.
         *   Without it, PS sees the PTY as a real terminal and formats output
         *   exactly as it appears in your actual PowerShell window.
         *
         * Why not interactive stdin?
         *   Sending commands via stdin causes the PTY to echo the typed text
         *   including the prompt (PS X:\...>) and the full command string.
         *   Using -Command avoids all that noise.
         */
        const shellArgs = isWin
            ? [
                '-NoLogo',
                '-Command',
                // Force UTF-8 output encoding, then run the user command
                `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $ErrorActionPreference = 'Continue'; ${command}; exit $LASTEXITCODE`
              ]
            : ['-c', command];

        return new Promise((resolve) => {
            let rawOutput = '';
            const mainWindow = BrowserWindow.getAllWindows()[0];
            const startTime = Date.now();

            console.log(`[TerminalRunTool] Executing: ${command} in ${spawnCwd}`);

            try {
                const ptyProcess = pty.spawn(shell, shellArgs, {
                    name: 'xterm-256color',
                    cols: 120,
                    rows: 30,
                    cwd: spawnCwd,
                    env: { ...process.env, LANG: 'en_US.UTF-8' },
                });

                ptyProcess.onData((data) => {
                    rawOutput += data;
                    // Forward raw PTY bytes to xterm.js — it renders ANSI natively
                    if (mainWindow && !mainWindow.isDestroyed() && requestId) {
                        mainWindow.webContents.send(`ai:tool-update:${requestId}`, {
                            name: 'terminal_run',
                            toolCallId: args.toolCallId,
                            output: data,
                            command,
                            spawnCwd
                        });
                    }
                });

                ptyProcess.onExit(({ exitCode }) => {
                    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                    const cleanOutput = stripAnsi(rawOutput);
                    const success = exitCode === 0;

                    console.log(`[TerminalRunTool] Finished (exit=${exitCode}) in ${duration}s`);

                    let resultText;

                    if (success) {
                        resultText = [
                            `✅ SUCCESS — exit code 0 (${duration}s)`,
                            `Command   : ${command}`,
                            `Directory : ${spawnCwd}`,
                            ``,
                            `OUTPUT:`,
                            cleanOutput || '(no output)'
                        ].join('\n');
                    } else {
                        const errorContext = extractErrorContext(cleanOutput);
                        resultText = [
                            `❌ FAILED — exit code ${exitCode} (${duration}s)`,
                            `Command   : ${command}`,
                            `Directory : ${spawnCwd}`,
                            `Platform  : Windows / PowerShell`,
                            ``,
                            `== ERROR OUTPUT ==`,
                            errorContext || cleanOutput || '(no output)',
                            ``,
                            `== DIAGNOSIS GUIDE ==`,
                            `Before retrying, identify which issue applies:`,
                            `  A) Syntax:   Did you use && instead of ; to chain? PowerShell requires ;`,
                            `  B) Variable: $var inside double-quotes is interpolated. Escape with \`$var or use single quotes.`,
                            `  C) Script:   .ps1 needs: powershell -ExecutionPolicy Bypass -File script.ps1`,
                            `  D) Missing:  Command not found? Check binary is installed (e.g. npm, node, git)`,
                            `  E) Path:     Wrong separator? Use \\\\ on Windows, not /`,
                            `  F) Encoding: Output garbled? That's a display issue — check logic, not encoding.`,
                            ``,
                            `FIX the root cause and retry with a corrected command.`,
                            `DO NOT rerun the exact same failed command.`
                        ].join('\n');
                    }

                    resolve({
                        text: resultText,
                        data: { command, exitCode, spawnCwd, output: cleanOutput, success, duration }
                    });
                });

            } catch (error) {
                console.error('[TerminalRunTool] Spawn error:', error);
                resolve({
                    text: [
                        `❌ SPAWN ERROR: ${error.message}`,
                        `Command   : ${command}`,
                        `Directory : ${spawnCwd}`,
                        ``,
                        `FIX: Verify the directory exists and the shell command is valid PowerShell.`
                    ].join('\n'),
                    data: null
                });
            }
        });
    }
}

module.exports = TerminalRunTool;
