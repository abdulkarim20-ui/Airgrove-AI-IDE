import { getIconForFile } from '../utils/file-icons.js';

export function renderResults(container, results, onClickMatch, replaceText = null) {
    container.innerHTML = "";

    const fileCount = Object.keys(results).length;
    if (fileCount === 0) {
        container.innerHTML = `<div class="no-results">No results found.</div>`;
        return;
    }

    // Group by file
    Object.entries(results).forEach(([file, matches]) => {
        const fileNode = document.createElement("div");
        fileNode.className = "search-file-node";

        // Header
        const header = document.createElement("div");
        header.className = "search-file-header";

        const displayName = file.split(/[\\/]/).pop();
        const resultCount = matches.length;

        // Chevron Icon
        const chevron = document.createElement("i");
        chevron.className = "codicon codicon-chevron-right";
        // Expanded by default
        let isExpanded = true;
        chevron.classList.add("codicon-chevron-down");
        chevron.classList.remove("codicon-chevron-right");

        // --- START: FILE ICON LOGIC ---
        const iconData = getIconForFile(displayName);
        let fileIcon;
        if (iconData.type === 'svg') {
            fileIcon = document.createElement('img');
            fileIcon.src = iconData.value;
            fileIcon.className = 'file-icon-svg';
        } else {
            fileIcon = document.createElement('i');
            fileIcon.className = `codicon ${iconData.value}`;
        }
        // --- END: FILE ICON LOGIC ---

        const label = document.createElement("span");
        label.textContent = `${displayName}`;

        const countBadge = document.createElement("span");
        countBadge.className = "search-count-badge";
        countBadge.textContent = resultCount;

        // Append order: Chevron -> File Icon -> Label -> Badge
        header.append(chevron, fileIcon, label, countBadge);

        const matchesContainer = document.createElement("div");
        matchesContainer.className = "search-matches-container";

        header.onclick = () => {
            isExpanded = !isExpanded;
            matchesContainer.style.display = isExpanded ? "block" : "none";
            if (isExpanded) {
                chevron.classList.add("codicon-chevron-down");
                chevron.classList.remove("codicon-chevron-right");
            } else {
                chevron.classList.remove("codicon-chevron-down");
                chevron.classList.add("codicon-chevron-right");
            }
        };

        // Matches
        matches.forEach(m => {
            const row = document.createElement("div");
            row.className = "search-match-row";

            // 1. Calculate leading whitespace length to trim it for display
            //    but keep track of the offset so we can adjust highlighting.
            const leadingSpaceCount = m.text.search(/\S|$/);
            const displayText = m.text.substring(leadingSpaceCount);

            // 2. Build the highlighted HTML
            //    m.matches contains [{start, length}, ...] relative to m.text
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();

            // We need to process matches that are inside our displayed text
            m.matches.forEach(match => {
                // Adjust start index relative to the trimmed string
                const adjustedStart = match.start - leadingSpaceCount;
                const adjustedEnd = adjustedStart + match.length;

                // Skip if match is entirely in the trimmed whitespace (shouldn't happen usually)
                if (adjustedEnd <= 0) return;

                // Text before the match (starting from lastIndex)
                // Ensure we don't start before 0 if match overlap with trim boundary
                const segmentStart = Math.max(0, adjustedStart);

                if (segmentStart > lastIndex) {
                    fragment.appendChild(document.createTextNode(displayText.substring(lastIndex, segmentStart)));
                }

                // Only show replace preview if there is actual replace text provided
                if (replaceText) {
                    // --- REPLACE PREVIEW MODE ---
                    // 1. Old Text (Deleted style)
                    const deleteSpan = document.createElement('span');
                    deleteSpan.className = 'search-replace-delete';
                    deleteSpan.textContent = displayText.substring(segmentStart, adjustedEnd);
                    fragment.appendChild(deleteSpan);

                    // 2. New Text (Inserted style)
                    const insertSpan = document.createElement('span');
                    insertSpan.className = 'search-replace-insert';
                    insertSpan.textContent = replaceText;
                    fragment.appendChild(insertSpan);
                } else {
                    // --- NORMAL SEARCH HIGHLIGHT MODE ---
                    // (Also covers empty replace string to avoid accidental "delete" preview during normal search)
                    const highlightSpan = document.createElement('span');
                    highlightSpan.className = 'search-highlight';
                    highlightSpan.textContent = displayText.substring(segmentStart, adjustedEnd);
                    fragment.appendChild(highlightSpan);
                }

                lastIndex = adjustedEnd;
            });

            // Append remaining text after last match
            if (lastIndex < displayText.length) {
                fragment.appendChild(document.createTextNode(displayText.substring(lastIndex)));
            }

            row.appendChild(fragment);

            row.onclick = () => {
                if (onClickMatch) onClickMatch(file, m);
            };

            matchesContainer.appendChild(row);
        });

        fileNode.appendChild(header);
        fileNode.appendChild(matchesContainer);
        container.appendChild(fileNode);
    });
}
