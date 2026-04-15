const fs = require("fs");
const path = require("path");

// List of common directories to ignore to prevent freezing
const IGNORED_DIRS = new Set([
    'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'out', 'target', 'bin', 'obj', 'vendor', '__pycache__'
]);

function walk(dir, files = []) {
    try {
        const items = fs.readdirSync(dir);
        // Optimize loop
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Fast check for hidden files or ignored dirs
            if (item.charCodeAt(0) === 46) continue; // Starts with '.' (dot)
            if (IGNORED_DIRS.has(item)) continue;

            const full = path.join(dir, item);
            let stat;
            try {
                stat = fs.statSync(full);
            } catch (e) { continue; }

            if (stat.isDirectory()) {
                // Safety: Don't recurse too deep? For now, just relying on ignore list.
                // We could check if files.length > 20000 to stop?
                walk(full, files);
            } else {
                // Check extension blacklist
                if (!item.match(/\.(exe|png|jpg|jpeg|gif|zip|dll|iso|dmg|tar|gz|mp4|mp3|pdf|ico|woff|woff2|ttf|eot)$/i)) {
                    files.push(full);
                }
            }
        }
    } catch (e) {
        // Ignore
    }
    return files;
}

module.exports = walk;
