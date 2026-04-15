
const { ipcMain } = require("electron");
const { RunService } = require("../services/RunService.js");
const editSessionService = require("../ai/services/EditSessionService");

const runService = new RunService();

function registerRunHandlers() {
    ipcMain.handle("run:execute", async (event, payload = {}) => {
        try {
            const filePath = payload.filePath;
            const cwd = payload.cwd;
            const previewContentFromRenderer = payload.previewContent;
            console.log(`[RunHandler] Request to run: ${filePath}`);
            // Use event.sender
            const sender = event.sender;

            const workingDir = cwd || (filePath ? require('path').dirname(filePath) : process.cwd());
            const fromSession = filePath ? editSessionService.getVirtualContent(filePath) : null;
            const virtualContent =
                (typeof fromSession === 'string' ? fromSession : null) ??
                (typeof previewContentFromRenderer === 'string' ? previewContentFromRenderer : null);

            const terminal = runService.runFile(filePath, workingDir, { virtualContent });
            terminal.removeAllListeners("output");
            terminal.removeAllListeners("exit");

            terminal.on("output", text => {
                if (!sender.isDestroyed()) {
                    sender.send("run:output", text);
                }
            });

            terminal.on("exit", code => {
                runService.cleanupVirtualRunFile();
                if (!sender.isDestroyed()) {
                    sender.send("run:exit", code);
                }
            });

            return true;
        } catch (e) {
            console.error("Run error:", e);
            try {
                if (event && event.sender && !event.sender.isDestroyed()) {
                    event.sender.send("run:output", `Error: ${e.message}\n`);
                }
            } catch (err) {/* ignore */ }
            return false;
        }
    });

    ipcMain.handle("run:stop", () => {
        runService.terminal.stop();
        runService.cleanupVirtualRunFile();
        return true;
    });
}

module.exports = { registerRunHandlers };
