const { diffLines } = require('diff');

class DiffService {
    static buildHunks(originalContent, proposedContent) {
        const parts = diffLines(originalContent ?? '', proposedContent ?? '', { newlineIsToken: true });
        const hunks = [];
        let oldLine = 1;
        let newLine = 1;
        let hunkIndex = 0;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const oldCount = this._lineCount(part.value);

            if (!part.added && !part.removed) {
                oldLine += oldCount;
                newLine += oldCount;
                continue;
            }

            const removedPart = part.removed ? part : null;
            const addedPart = part.added
                ? part
                : (parts[i + 1] && parts[i + 1].added ? parts[i + 1] : null);

            if (removedPart && addedPart && !part.added) {
                i += 1;
            }

            const removedText = removedPart ? removedPart.value : '';
            const addedText = addedPart ? addedPart.value : '';
            const removedLines = this._toLines(removedText);
            const addedLines = this._toLines(addedText);
            const removedCount = removedLines.length;
            const addedCount = addedLines.length;

            hunks.push({
                hunkId: `h${++hunkIndex}`,
                oldStart: oldLine,
                oldLines: removedCount,
                newStart: newLine,
                newLines: addedCount,
                removed: removedLines,
                added: addedLines,
                status: 'pending'
            });

            oldLine += removedCount;
            newLine += addedCount;
        }

        return hunks;
    }

    static _lineCount(text) {
        if (!text) return 0;
        return text.split(/\r?\n/).length - 1 + (text.endsWith('\n') ? 0 : 1);
    }

    static _toLines(text) {
        if (!text) return [];
        const lines = text.split(/\r?\n/);
        if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
        return lines;
    }
}

module.exports = DiffService;
