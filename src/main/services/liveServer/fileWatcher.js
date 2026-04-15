const chokidar = require('chokidar');
const path = require('path');

class FileWatcher {
    constructor(projectPath, callback, debounceTimeout = 400) {
        this.projectPath = projectPath;
        this.callback = callback;
        this.debounceTimeout = debounceTimeout;
        this.timers = new Map(); // Per-file debounce timers
        this.watcher = null;
    }

    start() {
        // Chokidar is reliable on all platforms, including Windows where fs.watch
        // misses events from editors that save via atomic rename (temp file → target).
        this.watcher = chokidar.watch(this.projectPath, {
            ignored: [
                /(^|[/\\])\../,           // Hidden files
                /node_modules/,            // Node modules
                /\.(swp|tmp|bak|orig)$/,  // Editor swap/temp files
            ],
            ignoreInitial: true,   // Don't fire events for existing files on startup
            persistent: true,
            awaitWriteFinish: {
                // Wait until the file write is fully complete before firing.
                // This handles atomic saves (editor writes temp → renames to target).
                stabilityThreshold: 100,
                pollInterval: 50
            }
        });

        this.watcher.on('change', (filePath) => {
            const fileName = path.basename(filePath);
            const ext = path.extname(fileName).toLowerCase();

            // Per-file debounce: rapid saves to the same file only fire once
            if (this.timers.has(filePath)) {
                clearTimeout(this.timers.get(filePath));
            }

            const timer = setTimeout(() => {
                this.timers.delete(filePath);
                this.callback({
                    fileName,
                    filePath,
                    extension: ext,
                    timestamp: Date.now()
                });
            }, this.debounceTimeout);

            this.timers.set(filePath, timer);
        });

        this.watcher.on('error', (err) => {
            console.error('[File Watcher] Error:', err);
        });

        console.log('[File Watcher] Watching:', this.projectPath);
    }

    stop() {
        // Clear all pending debounce timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();

        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        console.log('[File Watcher] Stopped.');
    }
}

module.exports = { FileWatcher };
