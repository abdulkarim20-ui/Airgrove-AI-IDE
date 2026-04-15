const fs = require('fs');
const path = require('path');

/**
 * Service to track file states (read/write timestamps) and handle text normalization.
 * Inspired by Claude Code's robustness.
 */
class FileStateService {
    constructor() {
        // Map of absolutePath -> { readTimestamp, writeTimestamp, lastModified }
        this.fileStates = new Map();
        
        // Quote constants
        this.LEFT_SINGLE_CURLY_QUOTE = '‘';
        this.RIGHT_SINGLE_CURLY_QUOTE = '’';
        this.LEFT_DOUBLE_CURLY_QUOTE = '“';
        this.RIGHT_DOUBLE_CURLY_QUOTE = '”';
    }

    /**
     * Record that a file was read by the AI.
     */
    recordRead(absolutePath, offset = 1, limit = null) {
        if (!fs.existsSync(absolutePath)) return;
        const stats = fs.statSync(absolutePath);
        this.fileStates.set(this._normalizePath(absolutePath), {
            readTimestamp: Date.now(),
            lastModified: stats.mtimeMs,
            lastReadOffset: offset,
            lastReadLimit: limit
        });
    }

    /**
     * Retrieves the recorded state for a normalized path.
     */
    getState(absolutePath) {
        return this.fileStates.get(this._normalizePath(absolutePath)) || null;
    }

    /**
     * Check if a file is stale (modified since the AI last read it).
     */
    isStale(absolutePath) {
        const state = this.fileStates.get(this._normalizePath(absolutePath));
        if (!state) return false; // Not read yet or no state

        if (!fs.existsSync(absolutePath)) return false;
        const stats = fs.statSync(absolutePath);
        
        // If the file's current modification time is newer than what we recorded during read
        return stats.mtimeMs > state.lastModified;
    }

    /**
     * Update state after a successful write.
     */
    recordWrite(absolutePath) {
        if (!fs.existsSync(absolutePath)) return;
        const stats = fs.statSync(absolutePath);
        const normalPath = this._normalizePath(absolutePath);
        const state = this.fileStates.get(normalPath) || {};
        
        this.fileStates.set(normalPath, {
            ...state,
            writeTimestamp: Date.now(),
            lastModified: stats.mtimeMs
        });
    }

    /**
     * Normalizes quotes in a string.
     */
    normalizeQuotes(str) {
        if (typeof str !== 'string') return str;
        return str
            .replaceAll(this.LEFT_SINGLE_CURLY_QUOTE, "'")
            .replaceAll(this.RIGHT_SINGLE_CURLY_QUOTE, "'")
            .replaceAll(this.LEFT_DOUBLE_CURLY_QUOTE, '"')
            .replaceAll(this.RIGHT_DOUBLE_CURLY_QUOTE, '"');
    }

    /**
     * Find the actual string in content that matches search, handles quote normalization.
     */
    findActualString(fileContent, searchString) {
        if (fileContent.includes(searchString)) return searchString;

        const normalizedSearch = this.normalizeQuotes(searchString);
        const normalizedFile = this.normalizeQuotes(fileContent);

        const index = normalizedFile.indexOf(normalizedSearch);
        if (index !== -1) {
            return fileContent.substring(index, index + searchString.length);
        }

        return null;
    }

    /**
     * Preserves curly quote style in new string if the original had them.
     */
    preserveQuoteStyle(oldString, actualOldString, newString) {
        if (oldString === actualOldString) return newString;

        const hasDouble = actualOldString.includes(this.LEFT_DOUBLE_CURLY_QUOTE) || actualOldString.includes(this.RIGHT_DOUBLE_CURLY_QUOTE);
        const hasSingle = actualOldString.includes(this.LEFT_SINGLE_CURLY_QUOTE) || actualOldString.includes(this.RIGHT_SINGLE_CURLY_QUOTE);

        if (!hasDouble && !hasSingle) return newString;

        let result = newString;
        if (hasDouble) result = this._applyCurlyQuotes(result, '"', this.LEFT_DOUBLE_CURLY_QUOTE, this.RIGHT_DOUBLE_CURLY_QUOTE);
        if (hasSingle) result = this._applyCurlyQuotes(result, "'", this.LEFT_SINGLE_CURLY_QUOTE, this.RIGHT_SINGLE_CURLY_QUOTE);

        return result;
    }

    _applyCurlyQuotes(str, target, open, close) {
        const chars = [...str];
        const res = [];
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === target) {
                const isOpening = i === 0 || /\s|[(\[{]/.test(chars[i - 1]);
                res.push(isOpening ? open : close);
            } else {
                res.push(chars[i]);
            }
        }
        return res.join('');
    }

    _normalizePath(p) {
        return path.resolve(p).toLowerCase();
    }

    /**
     * Strips trailing whitespace from each line while preserving line endings.
     */
    stripTrailingWhitespace(str) {
        if (!str) return str;
        const lines = str.split(/(\r\n|\n|\r)/);
        let result = '';
        for (let i = 0; i < lines.length; i++) {
            const part = lines[i];
            if (part !== undefined) {
                if (i % 2 === 0) {
                    // Even indices are line content
                    result += part.replace(/\s+$/, '');
                } else {
                    // Odd indices are line endings
                    result += part;
                }
            }
        }
        return result;
    }
}

module.exports = new FileStateService();
