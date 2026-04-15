
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { TerminalService } = require("./TerminalService.js");

class RunService {
    constructor() {
        this.terminal = new TerminalService();
        this.activeVirtualRunFilePath = null;
    }

    runFile(filePath, cwd, options = {}) {
        if (!filePath) {
            throw new Error("No file path provided");
        }
        this.cleanupVirtualRunFile();

        const virtualContent = options.virtualContent;
        const executionPath = typeof virtualContent === "string"
            ? this.createVirtualRunFile(filePath, virtualContent)
            : filePath;

        const ext = path.extname(filePath).toLowerCase();
        let cmd;
        let args = [];

        switch (ext) {
            case ".js":
                cmd = "node";
                args.push(`"${executionPath}"`);
                break;

            case ".py":
                cmd = "python";
                args.push("-u", `"${executionPath}"`);
                break;

            case ".ts":
                cmd = "npx";
                args.push("ts-node", `"${executionPath}"`);
                break;

            default:
                throw new Error(`Cannot run file with extension ${ext}`);
        }

        if (!cwd) {
            cwd = path.dirname(filePath);
        }

        this.terminal.runCommand(cmd, args, cwd);
        if (typeof virtualContent === "string") {
            this.terminal.emit("output", `[Preview Run] Running pending AI edits for ${path.basename(filePath)}\n`);
        }
        return this.terminal;
    }

    createVirtualRunFile(filePath, content) {
        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        const name = `.${base}.airgrove-preview-${crypto.randomUUID()}${ext}`;
        const virtualPath = path.join(dir, name);
        fs.writeFileSync(virtualPath, content, "utf-8");
        this.activeVirtualRunFilePath = virtualPath;
        return virtualPath;
    }

    cleanupVirtualRunFile() {
        if (!this.activeVirtualRunFilePath) return;
        try {
            if (fs.existsSync(this.activeVirtualRunFilePath)) {
                fs.unlinkSync(this.activeVirtualRunFilePath);
            }
        } catch (_) {
            // ignore cleanup failures
        } finally {
            this.activeVirtualRunFilePath = null;
        }
    }
}

module.exports = { RunService };
