import { materialIcons } from './material-icons.js';

const SvgIconBasePath = '../../assets/icons/';

// Common extensions to icon/language mapping when missing in fileExtensions
const extensionMapping = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescriptreact',
    jsx: 'javascriptreact',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    html: 'html',
    css: 'css',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sh: 'shellscript',
    bash: 'shellscript',
    zsh: 'shellscript',
    bat: 'bat',
    ps1: 'powershell',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    sql: 'sql',
    vue: 'vue',
    svelte: 'svelte',
    less: 'less',
    sass: 'sass',
    scss: 'scss',
    txt: 'text'
};

/**
 * Gets icon data for a given filename.
 * Logic Cascade: 1. Exact Filename -> 2. Double Extension -> 3. Extension -> 4. Language ID -> 5. Default
 */
export function getIconForFile(fileName, filePath = '') {
    if (filePath && filePath.startsWith('preview://')) {
        return { type: 'svg', value: '../../assets/modified_icons/eye-line.svg' };
    }
    if (filePath && filePath.startsWith('mcp://')) {
        return { type: 'svg', value: '../../assets/modified_icons/mcp_server.svg' };
    }
    if (fileName === 'Welcome') {
        return { type: 'codicon', value: 'codicon-home' };
    }

    const lowerFileName = fileName.toLowerCase();

    // 1. Exact Filename Match
    let iconName = materialIcons.fileNames[lowerFileName];

    // 2. Double Extension Match (e.g., .test.js, .d.ts, .spec.ts)
    if (!iconName) {
        const parts = lowerFileName.split('.');
        if (parts.length > 2) {
            const doubleExt = parts.slice(-2).join('.');
            iconName = materialIcons.fileExtensions[doubleExt];
        }
    }

    // 3. Single Extension Match
    let extension = '';
    if (!iconName) {
        extension = lowerFileName.split('.').pop();
        iconName = materialIcons.fileExtensions[extension];
    }

    // 4. Language ID / Common Mapping Match
    if (!iconName && extension) {
        const mappedLang = extensionMapping[extension];
        if (mappedLang) {
            // Check in languageIds and also directly as an iconName
            iconName = materialIcons.languageIds[mappedLang] || mappedLang;
        }
    }

    // 5. Default Fallback
    const iconDefKey = iconName || materialIcons.file || 'file';
    let iconDef = materialIcons.iconDefinitions[iconDefKey];

    // If the iconName itself wasn't found in Definitions, try falling back to 'file'
    if (!iconDef) {
        iconDef = materialIcons.iconDefinitions['file'];
    }

    // Extract filename from iconPath (e.g., "./../icons/git.svg" -> "git.svg")
    let iconFileName = iconDef ? iconDef.iconPath.split('/').pop() : 'file.svg';

    return { type: 'svg', value: `${SvgIconBasePath}${iconFileName}` };
}

/**
 * Gets icon data for a given folder name.
 */
export function getIconForFolder(folderName, isExpanded, isRoot = false) {
    // If it's a root folder, we use the "normal" folder icon from mapping
    // This avoids showing specialized icons (like 'src' or 'components') for the workspace name
    if (isRoot) {
        const iconName = isExpanded ? (materialIcons.folderExpanded || 'folder-open') : (materialIcons.folder || 'folder');
        const iconDef = materialIcons.iconDefinitions[iconName];
        const iconFileName = iconDef ? iconDef.iconPath.split('/').pop() : (isExpanded ? 'folder-open.svg' : 'folder.svg');
        return { type: 'svg', value: `${SvgIconBasePath}${iconFileName}` };
    }

    const lowerFolderName = folderName.toLowerCase();

    // 1. Folder Name Match (including root folder names)
    let iconName = materialIcons.folderNames[lowerFolderName] ||
        (materialIcons.rootFolderNames ? materialIcons.rootFolderNames[lowerFolderName] : null);

    // 2. Handle expanded variant
    if (isExpanded) {
        let expandedName = materialIcons.folderNamesExpanded ? materialIcons.folderNamesExpanded[lowerFolderName] : null;
        if (!expandedName && materialIcons.rootFolderNamesExpanded) {
            expandedName = materialIcons.rootFolderNamesExpanded[lowerFolderName];
        }

        if (expandedName) {
            iconName = expandedName;
        } else if (iconName) {
            // Check if there's an -open variant in definitions
            const potentialExpanded = `${iconName}-open`;
            if (materialIcons.iconDefinitions[potentialExpanded]) {
                iconName = potentialExpanded;
            }
        }
    }

    // 3. Default Fallback
    if (!iconName) {
        if (isExpanded) {
            iconName = materialIcons.folderExpanded || 'folder-open';
        } else {
            iconName = materialIcons.folder || 'folder';
        }
    }

    const iconDef = materialIcons.iconDefinitions[iconName];
    let iconFileName = iconDef ? iconDef.iconPath.split('/').pop() : (isExpanded ? 'folder-open.svg' : 'folder.svg');

    return { type: 'svg', value: `${SvgIconBasePath}${iconFileName}` };
}
