const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

class GitService {
    constructor() {
        this.git = null;
    }

    /**
     * Initialize git instance for a specific directory
     * @param {string} workingDir 
     */
    init(workingDir) {
        if (!workingDir) return;
        this.git = simpleGit(workingDir);
    }

    /**
     * Check if the current directory is a git repository
     * @param {string} dirPath 
     * @returns {Promise<boolean>}
     */
    async isRepo(dirPath) {
        if (!dirPath) return false;
        try {
            const git = simpleGit(dirPath);
            const isRepo = await git.checkIsRepo();
            return isRepo;
        } catch (e) {
            console.error('Error checking git repo:', e);
            return false;
        }
    }

    /**
     * Initialize a new git repository
     * @param {string} dirPath 
     */
    async initRepo(dirPath) {
        if (!dirPath) return false;
        try {
            const git = simpleGit(dirPath);
            await git.init();
            return true;
        } catch (e) {
            console.error('Error initializing repo:', e);
            return false;
        }
    }

    /**
     * Get the status of the repository
     * @param {string} dirPath 
     */
    async getStatus(dirPath) {
        if (!dirPath) return null;
        try {
            const git = simpleGit(dirPath);
            const status = await git.status();
            // Serialize to plain JSON to avoid "An object could not be cloned" IPC errors
            // caused by internal properties or prototypes in the simple-git response.
            return JSON.parse(JSON.stringify(status));
        } catch (e) {
            console.error('Error getting git status:', e);
            return null;
        }
    }
    /**
     * Stage specific files
     * @param {string} dirPath 
     * @param {string[]} files 
     */
    async stage(dirPath, files) {
        if (!dirPath || !files || files.length === 0) return false;
        try {
            const git = simpleGit(dirPath);
            await git.add(files);
            return true;
        } catch (e) {
            console.error('Error staging files:', e);
            return false;
        }
    }

    /**
     * Unstage specific files (reset HEAD)
     * @param {string} dirPath 
     * @param {string[]} files 
     */
    async unstage(dirPath, files) {
        if (!dirPath || !files || files.length === 0) return false;
        try {
            const git = simpleGit(dirPath);
            await git.reset(files);
            return true;
        } catch (e) {
            console.error('Error unstaging files:', e);
            return false;
        }
    }

    /**
     * Stage all changes
     * @param {string} dirPath 
     */
    async stageAll(dirPath) {
        if (!dirPath) return false;
        try {
            const git = simpleGit(dirPath);
            await git.add('.');
            return true;
        } catch (e) {
            console.error('Error staging all:', e);
            return false;
        }
    }

    /**
     * Unstage all changes
     * @param {string} dirPath 
     */
    async unstageAll(dirPath) {
        if (!dirPath) return false;
        try {
            const git = simpleGit(dirPath);
            await git.reset();
            return true;
        } catch (e) {
            console.error('Error unstaging all:', e);
            return false;
        }
    }

    /**
     * Discard changes for specific files (checkout)
     * @param {string} dirPath 
     * @param {string[]} files 
     */
    async discardChanges(dirPath, files) {
        if (!dirPath || !files || files.length === 0) return false;
        try {
            const git = simpleGit(dirPath);
            await git.checkout(files);
            return true;
        } catch (e) {
            // fallback for untracked files? usually we use clean for untracked, but checkout handles modified
            console.error('Error discarding files:', e);
            return false;
        }
    }

    /**
     * Commit changes
     * @param {string} dirPath 
     * @param {string} message 
     */
    async commit(dirPath, message) {
        if (!dirPath || !message) return { success: false, error: 'Missing path or message' };
        try {
            const git = simpleGit(dirPath);
            await git.commit(message);
            return { success: true };
        } catch (e) {
            console.error('Error committing:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Push changes
     * @param {string} dirPath 
     */
    async push(dirPath) {
        if (!dirPath) return false;
        try {
            const git = simpleGit(dirPath);
            await git.push();
            return { success: true };
        } catch (e) {
            console.error('Error pushing:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Pull changes
     * @param {string} dirPath 
     */
    async pull(dirPath) {
        if (!dirPath) return false;
        try {
            const git = simpleGit(dirPath);
            await git.pull();
            return { success: true };
        } catch (e) {
            console.error('Error pulling:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Fetch changes
     * @param {string} dirPath 
     */
    async fetch(dirPath) {
        if (!dirPath) return false;
        try {
            const git = simpleGit(dirPath);
            await git.fetch();
            return { success: true };
        } catch (e) {
            console.error('Error fetching:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Get commit history (log)
     * @param {string} dirPath 
     */
    async getLog(dirPath) {
        if (!dirPath) return [];
        try {
            const git = simpleGit(dirPath);
            // Get last 20 commits
            const log = await git.log({ maxCount: 20 });
            return log.all;
        } catch (e) {
            // It's normal to have no log in a new repo
            return [];
        }
    }
}

module.exports = new GitService();
