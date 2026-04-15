const { ipcMain } = require('electron');
const editSessionService = require('../ai/services/EditSessionService');

function registerEditReviewHandlers() {
    ipcMain.handle('ai:edits:get-session', async (_event, sessionId) => {
        const session = editSessionService.getSession(sessionId);
        if (!session) return { success: false, error: 'Session not found' };
        return { success: true, session };
    });
    ipcMain.handle('ai:edits:get-virtual-content', async (_event, filePath) => {
        const content = editSessionService.getVirtualContent(filePath);
        return { success: true, content };
    });

    ipcMain.handle('ai:edits:accept-session', async (_event, sessionId) => {
        return editSessionService.acceptSession(sessionId);
    });

    ipcMain.handle('ai:edits:reject-session', async (_event, sessionId) => {
        const ok = editSessionService.rejectSession(sessionId);
        return ok ? { success: true } : { success: false, error: 'Session not found' };
    });
}

module.exports = { registerEditReviewHandlers };
