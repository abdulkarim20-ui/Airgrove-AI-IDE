const BaseTool = require('../BaseTool');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * ListDirectoryTool - High-performance project exploration tool.
 * Equivalent to: ls -la with Git intelligence and professional summarization.
 */
class ListDirectoryTool extends BaseTool {
  constructor() {
    super();
    this.name = 'list_directory';
    this.description = 'List directory contents with Git status and metadata. Use this to understand project structure before reading files. Returns names, types, sizes, git state, and modification times.';
    this.parameters = {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the directory (e.g., "src" or ".")'
        },
        recursive: {
          type: 'boolean',
          description: 'Explore subdirectories recursively. Default: false',
          default: false
        },
        includeHidden: {
          type: 'boolean',
          description: 'Include hidden files (starting with .). Default: false',
          default: false
        },
        depth: {
          type: 'number',
          description: 'Max recursion depth (1-5). Default: 1',
          default: 1
        }
      },
      required: ['path']
    };
  }

  async execute({ path: dirPath, recursive = false, includeHidden = false, depth = 1, rootPath }) {
    try {
      const targetPath = path.isAbsolute(dirPath) ? dirPath : path.resolve(rootPath || process.cwd(), dirPath);
      const workspaceRoot = rootPath || process.cwd();

      // Validate path
      const stats = await fs.stat(targetPath).catch(() => null);
      if (!stats) return { text: `Error: Path not found: ${dirPath}`, data: { success: false } };
      if (!stats.isDirectory()) return { text: `Error: Not a directory: ${dirPath}`, data: { success: false } };

      // Get Git status for the directory if possible
      const gitStatus = await this._getGitStatus(targetPath, workspaceRoot);

      // Perform listing
      const items = await this._listDirectory(targetPath, recursive, includeHidden, 0, Math.min(depth, 5), gitStatus, workspaceRoot);
      
      // Professional summary
      const summary = this._generateSummary(items, dirPath);

      return {
        text: summary,
        data: {
          success: true,
          path: dirPath,
          absolutePath: targetPath,
          itemCount: items.length,
          items: items
        }
      };

    } catch (error) {
      return {
        text: `Error exploring ${dirPath}: ${error.message}`,
        data: { success: false, error: error.message }
      };
    }
  }

  async _listDirectory(dirPath, recursive, includeHidden, currentDepth, maxDepth, gitStatusMap, workspaceRoot) {
    if (currentDepth > maxDepth) return [];

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      // Professional filtering
      if (!includeHidden && entry.name.startsWith('.')) continue;
      if (!includeHidden && ['node_modules', '.git', 'dist', 'build', '.next', 'out'].includes(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
      
      const item = {
        name: entry.name,
        type: entry.isDirectory() ? 'folder' : 'file',
        path: relativePath,
        gitStatus: gitStatusMap.get(relativePath) || 'clean'
      };

      try {
        const stats = await fs.stat(fullPath);
        if (entry.isFile()) {
          item.size = stats.size;
          item.sizeHuman = this._formatBytes(stats.size);
          item.extension = path.extname(entry.name).toLowerCase();
        }
        item.mtime = stats.mtime.toISOString();
        item.lastModified = this._timeAgo(stats.mtime);

        // Recursion logic
        if (recursive && entry.isDirectory() && currentDepth < maxDepth) {
          item.children = await this._listDirectory(fullPath, recursive, includeHidden, currentDepth + 1, maxDepth, gitStatusMap, workspaceRoot);
          item.childCount = item.children.length;
        }
      } catch (e) {
        item.error = 'Inaccessible';
      }

      items.push(item);
    }

    // Professional sorting: Folders first, then by name
    return items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  async _getGitStatus(targetPath, workspaceRoot) {
    const statusMap = new Map();
    try {
      // Run git status --porcelain to get a machine-readable list of changes
      const { stdout } = await execPromise('git status --porcelain', { cwd: workspaceRoot });
      if (!stdout) return statusMap;

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const status = line.substring(0, 2).trim();
        const filePath = line.substring(3).replace(/\"/g, '').trim();
        
        // Map common codes to professional labels
        const labelMap = { 
          'M': 'modified', 'A': 'added', 'D': 'deleted', 
          'R': 'renamed', '??': 'untracked', '!!': 'ignored' 
        };
        statusMap.set(filePath, labelMap[status] || status);
      }
    } catch (e) {
      // Not a git repo or git not installed - fail silently
    }
    return statusMap;
  }

  _generateSummary(items, dirPath) {
    const total = items.length;
    const folders = items.filter(i => i.type === 'folder').length;
    const files = total - folders;
    const modified = items.filter(i => i.gitStatus !== 'clean').length;

    let text = `Contents of ${dirPath}:\n`;
    text += `Total: ${total} top-level items (${folders} folders, ${files} files)`;
    if (modified > 0) text += ` | ${modified} items have Git changes`;
    text += '\n\n';

    text += this._buildTreeString(items);

    return text;
  }

  _buildTreeString(items, indent = '') {
    let tree = '';
    for (const i of items) {
      const typeIcon = i.type === 'folder' ? '/' : ' ';
      const statusMark = i.gitStatus !== 'clean' ? ` [${i.gitStatus}]` : '';
      const sizeStr = i.type === 'file' ? ` (${i.sizeHuman})` : '';
      
      tree += `${indent}${typeIcon} ${i.name}${sizeStr}${statusMark} - ${i.lastModified}\n`;
      
      if (i.children && i.children.length > 0) {
        tree += this._buildTreeString(i.children, indent + '  ');
      }
    }
    return tree;
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, dm = 1, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  _timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}

module.exports = ListDirectoryTool;

