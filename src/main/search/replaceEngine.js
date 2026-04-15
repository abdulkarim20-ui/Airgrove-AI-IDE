const fs = require("fs");

function replaceAll(payload) {
    const { results, replaceValue } = payload;

    Object.entries(results).forEach(([file, matches]) => {
        try {
            let content = fs.readFileSync(file, "utf8");

            // Matches are per line in the search results: [{line: 1, text: "foo", matches: [{start: 0, length: 3}]}]
            // We need to be careful. The search result 'matches' are byte/char offsets *within the line*.
            // But we are editing the *file content*.
            // We should probably re-read the lines or calculate absolute offsets?

            // The user's snippet:
            /*
            matches.reverse().forEach(m => {
            content =
                content.slice(0, m.start) +
                replaceValue +
                content.slice(m.start + m.length);
            });
            */
            // Implies 'm' has absolute 'start'? 
            // In searchEngine.js snippet: matches are from `line.matchAll`. So `start` is relative to the line.
            // If replaceEngine treats `start` as absolute to file content, it will break.

            // Let's re-examine User's `searchEngine.js`:
            // lines.forEach((line, index) => { ... matches: [...line.matchAll(regex)] })
            // Yes, `m.index` is relative to the line start.

            // User's `replaceEngine.js` snippet:
            // `matches.reverse().forEach(m => { content = content.slice(0, m.start) ... })`
            // This implies `matches` in `replaceEngine` arguments are DIFFERENT from `results` in `searchEngine`?
            // OR the user's snippet is simplified/buggy regarding offsets.

            // "matches" in `replaceEngine` seems to iterate over the `results` object values?
            // In `searchEngine`, `results[file]` is an array of `{line, text, matches: []}` objects.
            // So `matches` in `Object.entries(results)` is `Array<LineResult>`.
            // If we iterate line results, we need to map them back to the content.

            // Correct approach for line-based string replacement without absolute offsets:
            // 1. Split file into lines.
            // 2. Modify targeted lines.
            // 3. Join back. 
            // This handles line endings carefully.

            // However, rewriting the whole file based on line splitting is safer.
            let lines = content.split(/\r?\n/);

            // We will process replacements.
            // `matches` is the array of line-hits for this file.
            // We should sort them by line index descending to avoid index shift if we add/remove lines? 
            // Actually, we are just modifying text *within* lines (mostly), but if replacement contains \n, it gets complex.
            // Assuming simple replacement for now as per snippet implication.

            // Let's sort criteria: line number descending.
            // But `results` from searchEngine might be localized.

            // Let's look at the `LineResult` object again:
            // { line: 1 (1-based), matches: [{start: 0, length: 3}] }

            matches.sort((a, b) => b.line - a.line).forEach(lineResult => {
                let lineIdx = lineResult.line - 1;
                if (lineIdx >= 0 && lineIdx < lines.length) {
                    let lineContent = lines[lineIdx];

                    // Now apply replacements within this line, right-to-left
                    // lineResult.matches is [{start, length}]

                    // We need to clone the matches to reverse them safely
                    [...lineResult.matches].sort((a, b) => b.start - a.start).forEach(m => {
                        lineContent =
                            lineContent.slice(0, m.start) +
                            replaceValue +
                            lineContent.slice(m.start + m.length);
                    });

                    lines[lineIdx] = lineContent;
                }
            });

            fs.writeFileSync(file, lines.join("\r\n")); // Normalized endings
        } catch (e) {
            console.error(`Failed to replace in ${file}`, e);
        }
    });

    return true;
}

module.exports = replaceAll;
