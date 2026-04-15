/* 📄 FILE: src/renderer/core/inspector.js */
(function () {
    let selectMode = false;
    let hoverElement = null;
    let selectedElement = null;

    let container = null;
    let hoverOverlay = null;
    let selectedOverlay = null;
    let hoverLabel = null;
    let selectedLabel = null;
    let addButton = null;
    let rafId = null;

    function createOverlays() {
        if (container) return;

        container = document.createElement("div");
        container.id = "airgrove-inspector-root";

        hoverOverlay = document.createElement("div");
        hoverOverlay.id = "airgrove-inspector-hover";

        selectedOverlay = document.createElement("div");
        selectedOverlay.id = "airgrove-inspector-selected";

        hoverLabel = document.createElement("div");
        hoverLabel.id = "airgrove-inspector-hover-label";

        selectedLabel = document.createElement("div");
        selectedLabel.id = "airgrove-inspector-selected-label";

        container.appendChild(hoverOverlay);
        container.appendChild(selectedOverlay);
        container.appendChild(hoverLabel);
        container.appendChild(selectedLabel);
        document.body.appendChild(container);
    }

    function updateElements() {
        if (!selectMode) return;

        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        // --- Update Hover Overlay & Label ---
        if (hoverElement && hoverElement !== selectedElement && document.body.contains(hoverElement)) {
            const rect = hoverElement.getBoundingClientRect();
            hoverOverlay.style.display = "block";
            hoverOverlay.style.width = rect.width + "px";
            hoverOverlay.style.height = rect.height + "px";
            hoverOverlay.style.transform = `translate3d(${rect.left + scrollX}px, ${rect.top + scrollY}px, 0)`;

            hoverLabel.style.display = "block";
            hoverLabel.innerText = getLabelText(hoverElement);
            let labelTop = rect.top + scrollY - 18;
            if (labelTop < scrollY) labelTop = rect.top + scrollY;
            hoverLabel.style.transform = `translate3d(${rect.left + scrollX}px, ${labelTop}px, 0)`;
        } else {
            hoverOverlay.style.display = "none";
            hoverLabel.style.display = "none";
        }

        // --- Update Selected Overlay, Label & Button ---
        if (selectedElement && document.body.contains(selectedElement)) {
            const rect = selectedElement.getBoundingClientRect();
            selectedOverlay.style.display = "block";
            selectedOverlay.style.width = rect.width + "px";
            selectedOverlay.style.height = rect.height + "px";
            selectedOverlay.style.transform = `translate3d(${rect.left + scrollX}px, ${rect.top + scrollY}px, 0)`;

            selectedLabel.style.display = "block";
            selectedLabel.innerText = getLabelText(selectedElement);
            let labelTop = rect.top + scrollY - 18;
            if (labelTop < scrollY) labelTop = rect.top + scrollY;
            selectedLabel.style.transform = `translate3d(${rect.left + scrollX}px, ${labelTop}px, 0)`;

            if (addButton) {
                addButton.style.display = "flex";
                let btnTop = rect.bottom + scrollY + 5;
                if (btnTop + 35 > scrollY + window.innerHeight) btnTop = rect.top + scrollY - 45;
                addButton.style.transform = `translate3d(${rect.left + scrollX}px, ${btnTop}px, 0)`;
            }
        } else {
            selectedOverlay.style.display = "none";
            selectedLabel.style.display = "none";
            if (addButton) addButton.style.display = "none";
            selectedElement = null;
        }
    }

    function getLabelText(el) {
        let text = el.tagName.toLowerCase();
        if (el.id) text += `#${el.id}`;
        else if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ').filter(c => c).slice(0, 2).join('.');
            if (classes) text += `.${classes}`;
        }
        return text;
    }

    function handleHover(e) {
        if (!selectMode) return;
        if (e.target.id && e.target.id.startsWith('airgrove-inspector')) {
            hoverElement = null;
            return;
        }
        hoverElement = e.target;
    }

    function handleSelect(e) {
        if (!selectMode) return;
        if (addButton && (e.target === addButton || addButton.contains(e.target))) return;

        e.preventDefault();
        e.stopPropagation();

        selectedElement = e.target;
        document.body.style.cursor = "pointer";
        showAddButton();
    }

    function showAddButton() {
        if (!addButton) {
            addButton = document.createElement("button");
            addButton.id = "airgrove-inspector-add-btn";
            addButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff99" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>Add to Chat`;

            addButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendElementToIDE(selectedElement);
                selectedElement = null;
                hoverElement = null;
                updateElements();
            };

            container.appendChild(addButton);
        }
    }

    function sendElementToIDE(el) {
        if (!el) return;
        const data = {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            innerHTML: el.innerHTML,
            outerHTML: el.outerHTML,
            textContent: el.textContent.trim().substring(0, 100),
            sourceFile: el.getAttribute('data-airgrove-file') || el.dataset.file,
            sourceLine: el.getAttribute('data-airgrove-line') || el.dataset.line
        };
        console.log("AIRGROVE_INSPECTOR:ELEMENT_SELECTED", JSON.stringify(data));
        window.parent.postMessage({ type: "ELEMENT_SELECTED", ...data }, "*");
    }

    function startTracking() {
        if (rafId) return;
        function loop() {
            updateElements();
            rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
    }

    function stopTracking() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function enableInspector() {
        selectMode = true;
        hoverElement = null;
        selectedElement = null;
        createOverlays();
        document.addEventListener("mousemove", handleHover, true);
        document.addEventListener("click", handleSelect, true);
        document.body.style.cursor = "default";
        startTracking();
    }

    function disableInspector() {
        selectMode = false;
        stopTracking();
        if (hoverOverlay) hoverOverlay.style.display = "none";
        if (selectedOverlay) selectedOverlay.style.display = "none";
        if (hoverLabel) hoverLabel.style.display = "none";
        if (selectedLabel) selectedLabel.style.display = "none";
        if (addButton) addButton.style.display = "none";

        hoverElement = null;
        selectedElement = null;
        document.removeEventListener("mousemove", handleHover, true);
        document.removeEventListener("click", handleSelect, true);
        document.body.style.cursor = "default";
        console.log("AIRGROVE_INSPECTOR:DISABLED");
        window.parent.postMessage({ type: "INSPECTOR_DISABLED" }, "*");
    }

    window.addEventListener("scroll", updateElements, true);
    window.addEventListener("resize", updateElements);
    window.addEventListener("orientationchange", updateElements);
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && selectMode) disableInspector();
    });

    window.addEventListener("message", (event) => {
        if (event.data.type === "TOGGLE_SELECT_MODE") {
            if (event.data.enabled) enableInspector();
            else disableInspector();
        }
    });

    console.log("[AirGrove Inspector] Scripts and Styles separated.");
})();
