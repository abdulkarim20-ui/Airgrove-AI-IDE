/* global monaco */
// Logic to apply highlighting and replace in Editor
// This file is loaded by the renderer logic but operates on the active monaco instance.

export function applyReplace(editor, matches, replacement) {
    // matches: an array of line matches, or specific match objects?
    // The 'replaceEngine' handles file-level replace. 
    // Monaco replace is for the *active editor* only (Live Preview or Single File Replace).
    // The User's snippet for MonacoSearchBridge:
    /*
    export function applyReplace(editor, matches, replacement) {
      editor.pushUndoStop();
  
      matches
        .flatMap(m => m.matches)
        .reverse()
        .forEach(match => {
          editor.executeEdits("search", [{
            range: new monaco.Range(
              match.line,
              match.start + 1,
              match.line,
              match.start + match.length + 1
            ),
            text: replacement
          }]);
        });
  
      editor.pushUndoStop();
    }
    */
    // Note: The `match` object in `m.matches` loop needs to be enriched.
    // My `searchEngine` returns: `results[file] = [{line, text, matches: [{start, length}]}]`.
    // So `m` is one `{line, text, matches}` object.
    // `m.matches` is `[{start, length}]`.
    // `match` in the flatMap is `{start, length}`.
    // BUT the snippet uses `match.line` inside the loop.
    // The flatMap destroys the `line` context if I flatMap just `m.matches`.
    // I must carry the line info.

    if (!editor) return;

    editor.pushUndoStop();

    const edits = [];

    matches.forEach(lineResult => {
        // lineResult: { line, text, matches: [{start, length}] }
        lineResult.matches.forEach(m => {
            // m: { start, length }
            edits.push({
                range: new monaco.Range(
                    lineResult.line,
                    m.start + 1, // Monaco is 1-based columns
                    lineResult.line,
                    m.start + m.length + 1
                ),
                text: replacement
            });
        });
    });

    // Sort edits (bottom up to be safe, though Monaco handles bulk edits well)
    // Actually executeEdits handles it if ranges don't overlap.

    editor.executeEdits("search", edits);
    editor.pushUndoStop();
}

/**
 * Highlights matches in the editor
 * @param {object} editor Monaco editor instance
 * @param {Array} matches Array of line results
 */
export function highlightMatches(editor, matches) {
    if (!editor) return;

    // Convert matches to decorations
    const decorations = [];
    matches.forEach(lineResult => {
        lineResult.matches.forEach(m => {
            decorations.push({
                range: new monaco.Range(
                    lineResult.line,
                    m.start + 1,
                    lineResult.line,
                    m.start + m.length + 1
                ),
                options: {
                    isWholeLine: false,
                    className: 'findMatch', // Built-in Monaco class? Or usage custom?
                    // We might need to define CSS for .findMatch if not standard
                    inlineClassName: 'search-editor-match-highlight'
                }
            });
        });
    });

    // We need to track decoration IDs to clear them later. 
    // Ideally we store them on the model or controller.
    // For now we assume we just return them.
    return editor.deltaDecorations([], decorations);
}
