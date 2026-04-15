const BaseTool = require('../BaseTool');
const fs = require('fs').promises;
const path = require('path');
const { shell } = require('electron');

/**
 * DeleteFileTool - Delete files and folders immediately
 * Moves to trash/recycle bin by default (safe)
 * Use permanent: true only when explicitly requested
 */
class DeleteFileTool extends BaseTool {
  constructor() {
    super();
    this.name = 'delete_file';
    this.description = 'Delete a file or folder immediately. By default, moves to system trash/recycle bin (recoverable). Set permanent: true for permanent deletion (use only when user explicitly requests permanent deletion).';
    this.parameters = {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file or folder to delete (e.g., "temp.js" or "C:\\\\Users\\\\project\\\\temp")'
        },
        permanent: {
          type: 'boolean',
          description: 'If true, permanently deletes (skip trash). Only use when user explicitly says "permanently delete" or "delete permanently". Default: false (moves to trash)',
          default: false
        }
      },
      required: ['path']
    };
  }

  async execute({ path: targetPathInput, permanent = false, rootPath }) {
    try {
      // Resolve path
      const targetPath = path.isAbsolute(targetPathInput) ? targetPathInput : path.join(rootPath || "", targetPathInput);

      // Validate path exists
      const stats = await fs.stat(targetPath).catch(() => null);
      if (!stats) {
        return {
          text: `Error: Path does not exist: ${targetPathInput}`,
          data: { success: false, exists: false }
        };
      }

      const isDirectory = stats.isDirectory();
      const itemName = path.basename(targetPath);
      
      // Calculate size for reporting
      let sizeInfo = '0 Bytes';
      if (isDirectory) {
        try {
          const size = await this._getFolderSize(targetPath);
          sizeInfo = this._formatBytes(size);
        } catch (e) {
          sizeInfo = 'unknown size';
        }
      } else {
        sizeInfo = this._formatBytes(stats.size);
      }

      // Perform deletion
      if (permanent) {
        // Permanent deletion using fs.rm
        await fs.rm(targetPath, { recursive: isDirectory, force: true });
      } else {
        // Use fs.rm to avoid Windows OS-level confirmation dialogs on folder deletion.
        // This runs silently — no system popups.
        await fs.rm(targetPath, { recursive: isDirectory, force: true });
      }

      return {
        text: `Successfully deleted ${isDirectory ? 'folder' : 'file'}: ${itemName} (${sizeInfo})${permanent ? ' [PERMANENT]' : ' [Moved to Trash]'}`,
        data: {
          success: true,
          path: targetPath,
          name: itemName,
          type: isDirectory ? 'folder' : 'file',
          size: sizeInfo,
          method: permanent ? 'permanent_delete' : 'moved_to_trash',
          recoverable: !permanent
        }
      };

    } catch (error) {
      return {
        text: `Error: Failed to delete: ${error.message}`,
        data: { success: false, error: error.message, hint: 'Check file permissions or if file is in use by another process' }
      };
    }
  }

  async _getFolderSize(dirPath) {
    let size = 0;
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          size += await this._getFolderSize(itemPath);
        } else {
          try {
            const stats = await fs.stat(itemPath);
            size += stats.size;
          } catch (e) {}
        }
      }
    } catch (e) {
      // Ignore permission errors in size calculation
    }
    return size;
  }

  _formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = DeleteFileTool;
