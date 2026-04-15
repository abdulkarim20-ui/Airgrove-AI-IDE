const { shell } = require('electron');
const path = require('path');

async function openBrowser(port, projectPath, activeFilePath) {
    let url = `http://localhost:${port}`;
    if (activeFilePath && projectPath) {
        let relativePath = path.relative(projectPath, activeFilePath);
        // Ensure the path is relative and doesn't escape project root
        if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
            const ext = path.extname(relativePath).toLowerCase();
            // Convert backslashes to forward slashes for URL
            const urlSubPath = relativePath.replace(/\\/g, '/');
            if (ext === '.html' || ext === '.htm') {
                url += '/' + urlSubPath;
            }
        }
    }
    await shell.openExternal(url);
}

module.exports = {
    openBrowser
};
