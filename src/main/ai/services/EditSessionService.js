const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DiffService = require('./DiffService');

class EditSessionService {
    constructor() {
        this.sessions = new Map();
        this.sessionOrder = [];
        this.virtualFiles = new Map();
    }

    createSession({ rootPath, proposedByFile = {} }) {
        const sessionId = crypto.randomUUID();
        const files = [];

        for (const [filePath, proposedContent] of Object.entries(proposedByFile)) {
            const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootPath, filePath);
            if (!this._isPathInsideWorkspace(rootPath, absolutePath)) {
                files.push({
                    filePath: absolutePath,
                    success: false,
                    error: 'Access denied: path outside workspace'
                });
                continue;
            }

            const diskExists = fs.existsSync(absolutePath);
            const diskContent = diskExists ? fs.readFileSync(absolutePath, 'utf-8') : '';
            const vKey = this._normalizePathKey(absolutePath);
            const baseContent = this.virtualFiles.has(vKey)
                ? this.virtualFiles.get(vKey)
                : diskContent;
            const exists = diskExists || this.virtualFiles.has(vKey);
            const originalContent = baseContent;
            const hunks = DiffService.buildHunks(originalContent, proposedContent);

            files.push({
                filePath: absolutePath,
                relativePath: path.isAbsolute(filePath) ? path.relative(rootPath, filePath) : filePath,
                success: true,
                action: exists ? 'edited' : 'created',
                originalContent,
                proposedContent,
                hunks
            });

            this.virtualFiles.set(this._normalizePathKey(absolutePath), proposedContent);

            // Write to disk immediately so changes can be run without manual acceptance
            try {
                const dir = path.dirname(absolutePath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(absolutePath, proposedContent, 'utf-8');
            } catch (error) {
                console.error('Failed to write proposed content to disk in createSession', error);
            }
        }

        const session = {
            sessionId,
            rootPath,
            createdAt: Date.now(),
            files
        };
        this.sessions.set(sessionId, session);
        this.sessionOrder.push(sessionId);
        return session;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }

    rejectSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        // Revert files on disk to their original content before this session
        for (const file of session.files) {
            if (file.success) {
                try {
                    if (file.action === 'created') {
                        if (fs.existsSync(file.filePath)) {
                            fs.unlinkSync(file.filePath);
                        }
                    } else {
                        fs.writeFileSync(file.filePath, file.originalContent, 'utf-8');
                    }
                } catch (error) {
                    console.error('Failed to revert file to original content in rejectSession', error);
                }
            }
        }

        const existed = this.sessions.delete(sessionId);
        if (!existed) return false;
        this.sessionOrder = this.sessionOrder.filter((id) => id !== sessionId);
        this._rebuildVirtualFiles();
        return true;
    }

    acceptSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return { success: false, error: 'Session not found' };

        const results = [];
        for (const file of session.files) {
            if (!file.success) {
                results.push({ filePath: file.filePath, success: false, error: file.error });
                continue;
            }
            try {
                const dir = path.dirname(file.filePath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(file.filePath, file.proposedContent, 'utf-8');
                results.push({
                    filePath: file.filePath,
                    success: true,
                    action: file.action,
                    added: file.hunks.reduce((n, h) => n + (h.added?.length || 0), 0),
                    removed: file.hunks.reduce((n, h) => n + (h.removed?.length || 0), 0)
                });
            } catch (error) {
                results.push({ filePath: file.filePath, success: false, error: error.message });
            }
        }

        this.sessions.delete(sessionId);
        this.sessionOrder = this.sessionOrder.filter((id) => id !== sessionId);
        this._rebuildVirtualFiles();
        return { success: true, results };
    }

    getVirtualContent(filePath) {
        const key = this._normalizePathKey(filePath);
        return this.virtualFiles.has(key) ? this.virtualFiles.get(key) : null;
    }

    _rebuildVirtualFiles() {
        this.virtualFiles.clear();
        for (const sessionId of this.sessionOrder) {
            const session = this.sessions.get(sessionId);
            if (!session) continue;
            for (const file of session.files || []) {
                if (file.success) {
                    this.virtualFiles.set(this._normalizePathKey(file.filePath), file.proposedContent);
                }
            }
        }
    }

    _normalizePathKey(filePath) {
        if (!filePath) return '';
        try {
            return path.resolve(filePath).replace(/\//g, '\\').toLowerCase();
        } catch {
            return filePath.replace(/\//g, '\\').toLowerCase();
        }
    }

    _isPathInsideWorkspace(rootPath, targetPath) {
        const nRoot = rootPath.replace(/\\/g, '/').toLowerCase();
        const nTarget = targetPath.replace(/\\/g, '/').toLowerCase();
        return nTarget.startsWith(nRoot);
    }
}

module.exports = new EditSessionService();
