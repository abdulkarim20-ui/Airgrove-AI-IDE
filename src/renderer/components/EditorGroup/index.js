// 📄 FILE: src/renderer/components/EditorGroup/index.js

import { TabsBar } from "./TabsBar/index.js";
import { Breadcrumbs } from "./Breadcrumbs/index.js";
// --- START: ADD THIS IMPORT ---
import { explorerState } from "../views/ExplorerView/explorer-state.js";
// --- START: ADD THIS IMPORT ---
import { PreviewView } from "../views/PreviewView/index.js";
import { McpManagerView } from "../views/McpManagerView/index.js";
// --- END: ADD THIS IMPORT ---
import { ImageView } from "./ImageView/index.js";
import { InlineEditReviewController } from "../../editor/InlineEditReviewController.js";

// A special identifier for our welcome tab
// WELCOME_PAGE_PATH constant removed

export class EditorGroup {
  constructor(containerElement) {
    this.container = containerElement;
    this.openFiles = [];
    this.activeFilePath = null;
    this.untitledCounter = 1;
    this.hintWidget = null; // To store the Monaco ContentWidget
    this.isHintVisible = false;
    this.suppressDirtyTracking = false;

    // --- START: ADD STATUS BAR ELEMENT REFERENCES ---
    this.languageStatusEl = document.getElementById("language-status");
    this.cursorStatusEl = document.getElementById("cursor-status");
    // --- END: ADD STATUS BAR ELEMENT REFERENCES ---

    // --- START: REVISED AND CORRECTED SETUP ---

    // 1. Create the dynamic elements that aren't in the HTML yet.
    this.tabsContainer = document.createElement("div");
    this.contentArea = document.createElement("div"); // This will hold the editor itself
    this.contentArea.style.height = "100%";
    this.contentArea.style.position = "relative";
    this.contentArea.style.paddingTop = "8px"; // NEW: 8px gap before code starts
    this.contentArea.style.boxSizing = "border-box"; // Ensure padding doesn't cause overflow

    // 2. Find the static elements that are already in the HTML.
    this.breadcrumbsContainer = document.getElementById(
      "breadcrumbs-container",
    );
    this.welcomeView = document.getElementById("welcome-view-container");

    // 3. **THIS IS THE FIX**: Manually re-order the elements in the DOM.
    //    We prepend the tabs container to ensure it's always at the very top.
    this.container.prepend(this.tabsContainer);
    //    Then, we place the breadcrumbs container directly after the tabs.
    this.tabsContainer.after(this.breadcrumbsContainer);
    //    Finally, we add the main content area at the end.
    this.container.appendChild(this.contentArea);

    // 4. Now, we create the editor wrapper and move the welcome view *into* our new contentArea.
    this.editorWrapper = document.createElement("div");
    this.editorWrapper.style.height = "100%";
    this.contentArea.appendChild(this.editorWrapper);
    this.contentArea.appendChild(this.welcomeView); // Move welcome view to its proper home

    // --- START: ADD BINARY VIEW ---
    this.binaryView = document.createElement("div");
    this.binaryView.className = "binary-view-container hidden";
    this.binaryView.innerHTML = `
            <i class="codicon codicon-warning warning-icon"></i>
            <div class="binary-message">The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.</div>
            <button class="open-anyway-btn">Open Anyway</button>
        `;
    this.contentArea.appendChild(this.binaryView);

    this.binaryView.querySelector(".open-anyway-btn").onclick = () => {
      if (this.activeFilePath) {
        this.openFile(this.activeFilePath, { forceText: true });
      }
    };
    // --- START: ADD PREVIEW VIEW ---
    this.previewView = new PreviewView(this.contentArea);
    this.mcpManagerView = new McpManagerView(this.contentArea);
    // --- END: ADD PREVIEW VIEW ---

    // --- START: ADD IMAGE VIEW ---
    this.imageViewContainer = document.createElement("div");
    this.imageViewContainer.className = "image-view-wrapper hidden";
    this.imageViewContainer.style.height = "100%";
    this.contentArea.appendChild(this.imageViewContainer);
    // --- END: ADD IMAGE VIEW ---

    // 5. Initialize the components as before.
    this.tabsBar = new TabsBar(this.tabsContainer);

    // --- START: EVENT LISTENERS FOR TABS ---
    this.tabsContainer.addEventListener("tab-selected", (e) => {
      this.setActiveFile(e.detail.filePath);
    });

    this.tabsContainer.addEventListener("tab-closed", (e) => {
      this.closeFile(e.detail.filePath);
    });

    this.tabsContainer.addEventListener("tab-pinned", (e) => {
      const file = this.openFiles.find((f) => f.path === e.detail.filePath);
      if (file) {
        file.isPreview = false;
        // Re-render to update the tab style
        this.tabsBar.render(this.openFiles, this.activeFilePath);
      }
    });

    this.container.addEventListener("preview-title-updated", (e) => {
      const { path, title } = e.detail;
      const file = this.openFiles.find((f) => f.path === path);
      if (file && file.name !== title) {
        file.name = title;
        this.tabsBar.render(this.openFiles, this.activeFilePath);
      }
    });

    this.container.addEventListener("preview-url-loaded", (e) => {
      const { path } = e.detail;
      const file = this.openFiles.find((f) => f.path === path);
      if (file && !file.isUrlLoaded) {
        file.isUrlLoaded = true;
        this.tabsBar.render(this.openFiles, this.activeFilePath);
      }
    });
    // --- END: EVENT LISTENERS FOR TABS ---
    this.breadcrumbs = new Breadcrumbs(this.breadcrumbsContainer);

    this.editor = monaco.editor.create(
      this.editorWrapper,
      {
        theme: "vscode-dark-modern",
        automaticLayout: true,
        minimap: {
          enabled: true,
          side: "right",
          renderCharacters: true,
          showSlider: "mouseover",
          maxColumn: 120,
          scale: 1,
          // --- NEW ADVANCED NAV ---
          showRegionHighlight: "always",
          showSymbolHighlight: true,
        },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily:
          "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', 'Menlo', 'Monaco', 'Courier New', monospace",
        lineHeight: 22,
        unusualLineTerminators: "off",
        renderLineHighlight: "all",
        suggestFontSize: 13,
        padding: { top: 10, bottom: 10 },

        // --- UNLOCKING ADVANCED FEATURES ---
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
          highlightActiveIndentationGuide: true,
        },
        stickyScroll: { enabled: true },

        formatOnPaste: true,
        formatOnType: true,
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoSurround: "languageDefined",

        dragAndDrop: true,
        links: true,
        mouseWheelZoom: true,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        cursorStyle: "line",

        suggest: {
          showStatusBar: true,
          preview: true,
          selectionMode: "recentlyUsedByPrefix",
        },
        quickSuggestions: { other: true, comments: true, strings: true },
        parameterHints: { enabled: true },
        inlineSuggest: { enabled: true },
        wordBasedSuggestions: true,
        tabCompletion: "on",

        colorDecorators: true,
        lightbulb: { enabled: true },
        codeLens: true,
        fontLigatures: true,

        folding: true,
        foldingStrategy: "indentation",
        showFoldingControls: "mouseover",
        matchBrackets: "always",

        tabSize: 4,
        insertSpaces: true,
        trimAutoWhitespace: true,
        renderWhitespace: "none", // Typical clean look, 'all' if user prefers dots

        definitionLinkOpensInPeek: false, // Standard navigation
        contextmenu: true,
      },
      {
        // --- NEW: Custom Opener Service (Click-to-Open inside editor) ---
        openerService: {
          open: async (resource) => {
            const filePath = resource.path || resource.fsPath;
            if (filePath) {
              this.openFile(filePath);
              return true;
            }
            return false;
          },
        },
      },
    );

    this._initHintWidget();
    this.inlineEditReview = new InlineEditReviewController(this);

    // Global Key Listeners removed to prevent duplicate handling.
    // Shortcuts should be handled by a centralized Keybinding Manager or the main entry point.

    // --- BIND EDITOR KEY SHORTCUTS ---
    // Save: Ctrl+S / Cmd+S
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.saveActiveFile();
    });

    // Close Tab: Ctrl+W / Cmd+W (Common browser/editor shortcut)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
      if (this.activeFilePath) {
        this.closeFile(this.activeFilePath);
      }
    });

    // --- START: ADD EDITOR EVENT LISTENER FOR CURSOR ---
    this.editor.onDidChangeCursorPosition((e) =>
      this._updateCursorStatus(e.position),
    );
    this.editor.onDidChangeModelContent(() => {
      if (this.suppressDirtyTracking) return;
      this._markActiveFileAsDirty();

      // Re-show hint if it's an untitled file and the content is cleared
      const isUntitled =
        this.activeFilePath && this.activeFilePath.startsWith("Untitled-");
      const model = this.editor.getModel();
      const isEmpty = model ? model.getValueLength() === 0 : false;

      if (isUntitled && isEmpty) {
        this.showHint();
      } else if (this.isHintVisible) {
        this.hideHint();
      }
    });
    // END: MODIFICATION

    // Initial render logic
    this._render();
    this._updateStatusBar(); // Set initial status bar state

    // --- START: ADD THIS EVENT LISTENER ---
    document.addEventListener("file-deleted", (e) => {
      const { filePath } = e.detail;
      this.handleFileDeletion(filePath);
    });
    // --- END: ADD THIS EVENT LISTENER ---

    // --- START: ADD RENAME EVENT LISTENER ---
    document.addEventListener("file-renamed", (e) => {
      this.handleFileRename(e.detail);
    });
    // --- END: ADD RENAME EVENT LISTENER ---

    // --- START: ADD FILE CONTENT CHANGED LISTENER ---
    document.addEventListener("file-content-changed", (e) => {
      this.reloadFile(e.detail.filePath);
    });
    // --- END: ADD FILE CONTENT CHANGED LISTENER ---

    // --- START: ADD WORKSPACE RELOAD LISTENER ---
    document.addEventListener("workspace-bootstrapped", () => {
      this.closeAllFiles();
    });
    document.addEventListener("open-mcp-manager", () => {
      this.openMcpManager();
    });
    document.addEventListener("ai-edit-review-start", async (e) => {
      const { sessionId } = e.detail || {};
      if (sessionId) {
        await this.inlineEditReview.startSession(sessionId);
      }
    });
    // --- END: ADD WORKSPACE RELOAD LISTENER ---

    // --- START: ADD COMMAND LISTENER ---
    document.addEventListener("command-new-file", () => {
      this.openNewFile();
    });
    // --- END: ADD COMMAND LISTENER ---
    // --- START: DRAG AND DROP TO OPEN FILES ---
    this.container.addEventListener(
      "dragover",
      (e) => {
        // Check if the drag is coming from our own tree view
        if (e.dataTransfer.types.includes("application/airgrove-item-path")) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
          this.container.classList.add("drag-over");
        }
      },
      true,
    ); // Capture phase to intercept before Monaco handles it

    this.container.addEventListener("dragleave", () => {
      this.container.classList.remove("drag-over");
    });

    this.container.addEventListener(
      "drop",
      (e) => {
        // Check if it's our specialty drag type
        if (e.dataTransfer.types.includes("application/airgrove-item-path")) {
          e.preventDefault();
          e.stopPropagation(); // Stop the event from reaching Monaco's internal text insertion logic
          this.container.classList.remove("drag-over");

          const filePath = e.dataTransfer.getData(
            "application/airgrove-item-path",
          );
          if (filePath) {
            this.openFile(filePath, { preview: false });
          }
        }
      },
      true,
    ); // Capture phase is key
    // --- END: DRAG AND DROP ---
  }

  // _showWelcomePage method removed - handled by default empty state in _render

  // --- START: NEW METHOD ---
  isImageFile(filePath) {
    if (!filePath) return false;
    const ext = filePath.split(".").pop().toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp", "ico", "svg"].includes(ext);
  }

  isNonTextFile(filePath) {
    if (!filePath) return false;
    const previewExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xlsx",
      ".pptx",
      ".zip",
      ".exe",
      ".dll",
    ];
    return previewExtensions.some((ext) =>
      filePath.toLowerCase().endsWith(ext),
    );
  }
  // --- END: NEW METHOD ---

  // START: NEW METHOD
  _markActiveFileAsDirty() {
    const activeFile = this.openFiles.find(
      (f) => f.path === this.activeFilePath,
    );
    if (activeFile) {
      // Editing a file pins it
      if (activeFile.isPreview) {
        activeFile.isPreview = false;
      }
      if (!activeFile.isDirty) {
        activeFile.isDirty = true;
        this.tabsBar.render(this.openFiles, this.activeFilePath); // Re-render tabs to show dirty state
      }
    }
  }
  // END: NEW METHOD

  // --- START: NEW METHOD to update cursor status ---
  _updateCursorStatus(position) {
    if (position) {
      this.cursorStatusEl.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
    } else {
      this.cursorStatusEl.textContent = ""; // Clear if no position
    }
  }
  // --- END: NEW METHOD ---

  // --- START: NEW METHOD to update language status ---
  _updateLanguageStatus(filePath) {
    const langId = this._getLanguageFromPath(filePath);

    // Map language IDs to user-friendly names
    const names = {
      plaintext: "Plain Text",
      javascript: "JavaScript",
      typescript: "TypeScript",
      python: "Python",
      java: "Java",
      csharp: "C#",
      cpp: "C++",
      go: "Go",
      html: "HTML",
      css: "CSS",
      json: "JSON",
      markdown: "Markdown",
    };

    const langName =
      names[langId] || langId.charAt(0).toUpperCase() + langId.slice(1);
    const iconPath = "../../assets/modified_icons/braces.svg";

    this.languageStatusEl.innerHTML = `
            <div 
                class="lang-icon" 
                style="-webkit-mask-image: url(${iconPath}); mask-image: url(${iconPath});"
            ></div>
            <span>${langName}</span>
        `;
  }
  // --- END: NEW METHOD ---

  // --- START: NEW METHOD to update the whole status bar ---
  _updateStatusBar() {
    const file = this.openFiles.find((f) => f.path === this.activeFilePath);

    // Smart Visibility: Only show language/cursor for real code files, hide for Browse/Preview tabs
    if (file && !file.isBrowser) {
      if (file.isImage) {
        // This is initially cleared, and then immediately updated by the ImageView's callback
        this.languageStatusEl.innerHTML = "";
        this.cursorStatusEl.textContent = "";
      } else if (file.isBinary) {
        this.languageStatusEl.innerHTML = "";
        this.cursorStatusEl.textContent = "";
      } else {
        this._updateLanguageStatus(file.path);
        this._updateCursorStatus(this.editor.getPosition());
      }
    } else {
      // Clear for welcome page or browser preview tabs
      this.languageStatusEl.innerHTML = "";
      this.cursorStatusEl.textContent = "";
    }
  }
  // --- END: NEW METHOD ---

  // --- START: NEW METHOD FOR IMAGE DISPLAY STATUS ---
  updateImageInfo(data) {
    if (data) {
      this.languageStatusEl.innerHTML = `
                <div class="lang-icon" style="-webkit-mask-image: url(../../assets/modified_icons/image.svg); mask-image: url(../../assets/modified_icons/image.svg);"></div>
                <span>${data.dimensions}</span>
                <span style="margin-left: 12px;">${data.size}</span>
            `;
      this.cursorStatusEl.innerHTML = `
                <span class="ag-zoom-value" style="cursor: pointer; display: inline-block; padding: 0 4px;" title="Reset Zoom">${data.zoom}</span>
            `;

      const zoomEl = this.cursorStatusEl.querySelector(".ag-zoom-value");
      if (zoomEl) {
        zoomEl.onmouseover = () => {
          zoomEl.style.color = "#ffffff";
        };
        zoomEl.onmouseleave = () => {
          zoomEl.style.color = "";
        };
        zoomEl.onclick = () => {
          if (this.currentImageView) {
            this.currentImageView.setZoom(100);
          }
        };
      }
    } else {
      this.languageStatusEl.innerHTML = "";
      this.cursorStatusEl.textContent = "";
    }
  }
  // --- END: NEW METHOD ---

  async openFile(filePath, options = {}) {
    // Check if file is already open
    const existingFile = this.openFiles.find((f) => f.path === filePath);
    if (existingFile) {
      // Pin if requested (e.g. double click)
      if (options.preview === false) {
        existingFile.isPreview = false;
        this.tabsBar.render(this.openFiles, this.activeFilePath);
      }

      // If we are forcing text on an already open (binary) file
      if (options.forceText && existingFile.isBinary) {
        const fileData = await window.electronAPI.readFile(filePath, true);
        if (fileData) {
          existingFile.isBinary = false;
          existingFile.content = fileData.content;
          if (existingFile.model) existingFile.model.dispose();
          existingFile.model = monaco.editor.createModel(
            fileData.content,
            this._getLanguageFromPath(fileData.path),
          );
        }
      }

      if (options.noFocus) {
        this._render(); // Just refresh tags to show it might have been pinned
        return;
      }

      this.setActiveFile(filePath);
      if (options.selection) {
        this._revealSelection(options.selection);
      }
      return;
    }

    // If we are opening a NEW file in preview mode, check if there is an existing preview tab to reuse
    if (options.preview !== false) {
      // Default is preview unless explicitly false
      const previewTabCallback = (file) => file.isPreview && !file.isDirty;
      const existingPreviewIndex = this.openFiles.findIndex(previewTabCallback);

      if (existingPreviewIndex !== -1) {
        // Reuse this slot!
        // dispose old model
        const oldFile = this.openFiles[existingPreviewIndex];
        if (oldFile.model) oldFile.model.dispose();

        // Remove it temporarily (we will push the new one, or replace in place)
        this.openFiles.splice(existingPreviewIndex, 1);
      }
    }

    const fileData = await window.electronAPI.readFile(
      filePath,
      options.forceText,
    );
    if (fileData) {
      const isImage = this.isImageFile(fileData.path);
      const isNonText = this.isNonTextFile(fileData.path);
      const isBinary = fileData.isBinary || isNonText;

      const newFile = {
        path: fileData.path,
        name: fileData.path.split(/[\\/]/).pop(),
        content: fileData.content,
        isDirty: false,
        isBinary: isBinary || false,
        isImage: isImage,
        isPreview: options.preview !== false, // TRUE by default if not specified false
        model:
          (isBinary && !options.forceText) || isImage
            ? null
            : monaco.editor.createModel(
                fileData.content,
                this._getLanguageFromPath(fileData.path),
              ),
      };

      // Insert or push?
      // If we just removed a preview tab, we should probably insert at the same index?
      // For simplicity, just push. VS Code actually keeps the position.
      // Let's just push for now.
      this.openFiles.push(newFile);

      if (options.noFocus) {
        this._render();
        return;
      }

      this.setActiveFile(newFile.path);
      if (options.selection) {
        this._revealSelection(options.selection);
      }
    }
  }

  openBinaryFile(filePath) {
    const existingFile = this.openFiles.find((f) => f.path === filePath);
    if (existingFile) {
      this.setActiveFile(filePath);
      return;
    }

    const fileName = filePath.split(/[\\/]/).pop();

    // Immediately create a tab for the file if not exists
    const fileEntry = {
      path: filePath,
      name: fileName,
      isBinary: true,
      content: "",
    };

    // Add to your openFiles array and set as active
    this.openFiles.push(fileEntry);
    this.setActiveFile(filePath);

    // Switch your UI to the BinaryView component instantly
    this.showBinaryView(filePath);
  }

  showBinaryView(filePath) {
    this._render();
  }

  openBrowser() {
    const existingBrowser = this.openFiles.find((f) => f.isBrowser);
    if (existingBrowser) {
      this.setActiveFile(existingBrowser.path);
    } else {
      this.openPreview();
    }
  }

  openMcpManager() {
    const existingMcpTab = this.openFiles.find((f) => f.isMcpManager);
    if (existingMcpTab) {
      this.setActiveFile(existingMcpTab.path);
    } else {
      const mcpPath = "mcp://manager";
      const mcpFile = {
        path: mcpPath,
        name: "MCP Server",
        isDirty: false,
        isPreview: false,
        isBrowser: false,
        isMcpManager: true,
      };
      this.openFiles.push(mcpFile);
      this.setActiveFile(mcpPath);
    }
  }

  openPreview() {
    const id = Date.now();
    const previewPath = `preview://browser/${id}`;

    const previewFile = {
      path: previewPath,
      name: "Preview",
      isDirty: false,
      isPreview: false,
      isBrowser: true,
    };
    this.openFiles.push(previewFile);

    this.setActiveFile(previewPath);

    // Notify that we have a browser tab
    document.dispatchEvent(
      new CustomEvent("browser-tabs-changed", {
        detail: { hasBrowserTabs: true },
      }),
    );
  }

  _revealSelection(selection) {
    if (!this.editor) return;
    // Selection object: { startLineNumber, startColumn, endLineNumber, endColumn }
    // Simple validation
    if (selection.startLineNumber) {
      const range = new monaco.Range(
        selection.startLineNumber,
        selection.startColumn || 1,
        selection.endLineNumber || selection.startLineNumber,
        selection.endColumn || 1,
      );
      this.editor.revealRangeInCenter(range);
      this.editor.setSelection(range);
      this.editor.focus();
    }
  }

  openNewFile() {
    // Find the next available untitled number
    let counter = 1;
    while (this.openFiles.some((f) => f.path === `Untitled-${counter}`)) {
      counter++;
    }

    const untitledPath = `Untitled-${counter}`;
    const newFile = {
      path: untitledPath,
      name: `Untitled-${counter}`,
      content: "",
      isDirty: false, // Start as not dirty, but will become dirty on first edit
      model: monaco.editor.createModel("", "plaintext"),
    };
    // this.untitledCounter usage removed
    this.openFiles.push(newFile);
    this.setActiveFile(newFile.path);
  }

  // START: ADD THIS ENTIRE METHOD
  async saveActiveFile() {
    const activeFile = this.openFiles.find(
      (f) => f.path === this.activeFilePath,
    );
    if (!activeFile || !activeFile.model) return;

    const currentContent = activeFile.model.getValue();

    // If it's an untitled file, we need to show a "Save As" dialog
    if (activeFile.path.startsWith("Untitled-")) {
      const newFilePath =
        await window.electronAPI.saveFileDialog(currentContent);
      if (newFilePath) {
        // Update file properties
        activeFile.path = newFilePath;
        activeFile.name = newFilePath.split(/[\\/]/).pop();
        activeFile.isDirty = false;

        // Update the Monaco model's language based on the new extension
        const newLanguage = this._getLanguageFromPath(newFilePath);
        monaco.editor.setModelLanguage(activeFile.model, newLanguage);

        // KEY FIX: Manually update activeFilePath before calling setActiveFile
        // This ensures we don't try to look up the old 'Untitled-' path
        this.activeFilePath = newFilePath;

        // The file is now saved, so we re-render everything
        // We pass true to force a refresh even if it's the same path
        this.setActiveFile(activeFile.path, true);

        // --- START: ADD THIS LOGIC TO TRIGGER REFRESH ---
        const rootPath = explorerState.getRootPath();
        if (rootPath && newFilePath.startsWith(rootPath)) {
          document.dispatchEvent(
            new CustomEvent("explorer-refresh-triggered", {
              detail: { activeFileToHighlight: newFilePath },
            }),
          );
        }
        // --- END: ADD THIS LOGIC ---
      }
    } else {
      // If it's an existing file, just save it
      const result = await window.electronAPI.saveFile({
        filePath: activeFile.path,
        content: currentContent,
      });
      if (result.success) {
        activeFile.isDirty = false;
        this.setActiveFile(activeFile.path, true); // Force refresh of tabs to remove dirty state

        // Trigger Live Server reload on save
        if (window.electronAPI.triggerLiveReload) {
          window.electronAPI.triggerLiveReload();
        }
      } else {
        console.error("Failed to save file:", result.error);
        // Optionally, show a notification to the user
      }
    }
  }
  // END: ADD THIS ENTIRE METHOD

  // --- START: NEW METHODS FOR FILE MENU ---

  async saveActiveFileAs() {
    const activeFile = this.openFiles.find(
      (f) => f.path === this.activeFilePath,
    );
    if (!activeFile || !activeFile.model) return;

    const currentContent = activeFile.model.getValue();
    // Assuming saveFileDialog can take content or just returns path. Using existing pattern.
    const newFilePath = await window.electronAPI.saveFileDialog(currentContent);

    if (newFilePath) {
      activeFile.path = newFilePath;
      activeFile.name = newFilePath.split(/[\\/]/).pop();
      activeFile.isDirty = false;

      const newLanguage = this._getLanguageFromPath(newFilePath);
      monaco.editor.setModelLanguage(activeFile.model, newLanguage);

      this.activeFilePath = newFilePath;
      this.setActiveFile(activeFile.path, true);

      const rootPath = explorerState.getRootPath();
      if (rootPath && newFilePath.startsWith(rootPath)) {
        document.dispatchEvent(
          new CustomEvent("explorer-refresh-triggered", {
            detail: { activeFileToHighlight: newFilePath },
          }),
        );
      }
    }
  }

  async saveAllFiles() {
    for (const file of this.openFiles) {
      if (file.isDirty) {
        if (file.path.startsWith("Untitled-")) {
          // For untitled files, we must prompt, so we switch to it and run save
          this.setActiveFile(file.path);
          await this.saveActiveFile();
        } else if (file.model) {
          const content = file.model.getValue();
          const result = await window.electronAPI.saveFile({
            filePath: file.path,
            content,
          });
          if (result.success) {
            file.isDirty = false;
          }
        }
      }
    }
    this._render(); // Final refresh to update all tabs
  }

  async revertActiveFile() {
    const activeFile = this.openFiles.find(
      (f) => f.path === this.activeFilePath,
    );
    if (!activeFile || activeFile.path.startsWith("Untitled-")) return;

    // Reloads from disk
    await this.reloadFile(this.activeFilePath);
  }

  closeActiveTab() {
    if (this.activeFilePath) {
      this.closeFile(this.activeFilePath);
    }
  }

  // --- END: NEW METHODS FOR FILE MENU ---

  closeFile(filePath) {
    const fileIndex = this.openFiles.findIndex((f) => f.path === filePath);
    if (fileIndex === -1) return;

    const fileToClose = this.openFiles[fileIndex];

    // If it's a real file, dispose of its model
    if (fileToClose.model) {
      fileToClose.model.dispose();
    }

    // If it's a browser preview, dispose of its session
    if (fileToClose.isBrowser) {
      this.previewView.dispose(filePath);
    }

    this.openFiles.splice(fileIndex, 1);

    if (this.activeFilePath === filePath) {
      if (this.openFiles.length > 0) {
        const newActiveIndex = Math.max(0, fileIndex - 1);
        this.setActiveFile(this.openFiles[newActiveIndex].path);
      } else {
        this.activeFilePath = null;
        this.editor.setModel(null); // No files open, clear the editor
        this._updateStatusBar(); // UPDATE: Clear status bar when last file is closed
        // START: MODIFICATION
        // Dispatch event to clear highlight in explorer when last tab is closed
        document.dispatchEvent(
          new CustomEvent("active-file-changed", {
            detail: { filePath: null },
          }),
        );
        // END: MODIFICATION
      }
    }

    this._render();

    // Notify if browser tabs status might have changed
    const hasBrowserTabs = this.openFiles.some((f) => f.isBrowser);
    document.dispatchEvent(
      new CustomEvent("browser-tabs-changed", {
        detail: { hasBrowserTabs },
      }),
    );
  }

  // --- START: NEW METHOD ---
  closeAllFiles() {
    // Dispose all models
    this.openFiles.forEach((file) => {
      if (file.model) {
        file.model.dispose();
      }
    });

    // Clear state
    this.openFiles = [];
    this.activeFilePath = null;
    this.editor.setModel(null);
    // We can optionally reset the untitled counter or leave it unique per session
    // this.untitledCounter = 1;

    // Update UI
    this._render();
    this._updateStatusBar();

    // Notify
    document.dispatchEvent(
      new CustomEvent("active-file-changed", {
        detail: { filePath: null },
      }),
    );

    document.dispatchEvent(
      new CustomEvent("browser-tabs-changed", {
        detail: { hasBrowserTabs: false },
      }),
    );
  }
  // --- END: NEW METHOD ---

  // --- START: ADD THIS ENTIRE NEW METHOD ---
  handleFileDeletion(filePath) {
    const fileIsOpen = this.openFiles.some((f) => f.path === filePath);
    if (fileIsOpen) {
      // Find the tab's DOM element
      const safeFilePath = filePath.replace(/\\/g, "\\\\");
      const tabElement = this.tabsContainer.querySelector(
        `.tab-item[data-file-path="${safeFilePath}"]`,
      );

      if (tabElement) {
        // Add a class for the strikethrough animation
        tabElement.classList.add("deleted");
        // If the deleted file is open, close it
        if (this.openFiles.some((f) => f.path === filePath)) {
          this.closeFile(filePath);
        }
      }
    }
  }

  handleFileRename({ oldPath, newPath }) {
    const file = this.openFiles.find((f) => f.path === oldPath);
    if (file) {
      file.path = newPath;
      file.name = newPath.split(/[\\/]/).pop();
      // Update the language
      const newLanguage = this._getLanguageFromPath(newPath);
      if (file.model) {
        monaco.editor.setModelLanguage(file.model, newLanguage);
      }

      if (this.activeFilePath === oldPath) {
        this.activeFilePath = newPath;
        // Update dirty state visual
        document.dispatchEvent(
          new CustomEvent("active-file-changed", {
            detail: { filePath: newPath },
          }),
        );
      }
      this._render();
    }
  }

  setActiveFile(filePath, forceRefresh = false) {
    if (this.activeFilePath === filePath && !forceRefresh) return;

    const file = this.openFiles.find((f) => f.path === filePath);
    if (!file) return;

    this.activeFilePath = filePath;

    // --- START: TOGGLE PADDING ---
    if (file.isBrowser || file.isImage || file.isMcpManager) {
      this.contentArea.style.paddingTop = "0px";
    } else {
      this.contentArea.style.paddingTop = "8px";
    }
    // --- END: TOGGLE PADDING ---

    if (file.isBrowser || file.isMcpManager) {
      this.editor.setModel(null);
    } else {
      this.editor.setModel(file.model);
    }

    // --- START: HINT WIDGET VISIBILITY CHECK ---
    // Show hint if it's an untitled new file AND it's empty
    const isUntitled = filePath.startsWith("Untitled-");
    const isEmpty = file.model ? file.model.getValueLength() === 0 : false;

    if (isUntitled && isEmpty) {
      this.showHint();
    } else {
      this.hideHint();
    }
    // --- END: HINT WIDGET VISIBILITY CHECK ---

    this._render();
    this._updateStatusBar();
    this.editor.focus();

    // START: MODIFICATION
    // Announce that the active file has changed so other components can react
    document.dispatchEvent(
      new CustomEvent("active-file-changed", {
        detail: { filePath: this.activeFilePath },
      }),
    );
    // END: MODIFICATION
  }

  // --- START: MODIFIED RENDER LOGIC for Background Welcome View ---
  _render() {
    this.tabsBar.render(this.openFiles, this.activeFilePath);
    this.breadcrumbs.render(this.activeFilePath);

    const activeFile = this.openFiles.find(
      (f) => f.path === this.activeFilePath,
    );

    if (this.openFiles.length === 0) {
      // No files open -> Show Welcome View (Empty State)
      this.contentArea.style.paddingTop = "0px"; // No padding for welcome view to be centered
      this.welcomeView.classList.remove("hidden");
      this.editorWrapper.classList.add("hidden");
      this.binaryView.classList.add("hidden");
      this.previewView.hide();
      this.imageViewContainer.classList.add("hidden");
      if (this.mcpManagerView) this.mcpManagerView.hide();
      if (this.currentImageView) {
        this.currentImageView.dispose();
        this.currentImageView = null;
      }

      // Hide the tabs bar container
      this.tabsContainer.style.display = "none";

      const hasOpenFolder = !!explorerState.getRootPath();
      const welcomeGrid = this.welcomeView.querySelector(".welcome-main-grid");
      if (welcomeGrid) {
        welcomeGrid.style.display = hasOpenFolder ? "none" : "grid";
      }

      // --- END: NEW CHECK ---
    } else {
      // Files are open -> Hide Welcome View
      this.contentArea.style.paddingTop = "8px"; // Restore padding for editor content
      this.welcomeView.classList.add("hidden");

      if (activeFile && activeFile.isMcpManager) {
        this.editorWrapper.classList.add("hidden");
        this.binaryView.classList.add("hidden");
        this.previewView.hide();
        this.imageViewContainer.classList.add("hidden");
        if (this.mcpManagerView) this.mcpManagerView.show();
      } else if (activeFile && activeFile.isImage) {
        this.editorWrapper.classList.add("hidden");
        this.binaryView.classList.add("hidden");
        this.previewView.hide();
        this.imageViewContainer.classList.remove("hidden");
        if (this.mcpManagerView) this.mcpManagerView.hide();

        if (this.currentImageView) this.currentImageView.dispose();
        this.currentImageView = new ImageView(
          this.imageViewContainer,
          activeFile.path,
          (data) => {
            this.updateImageInfo(data);
          },
        );
      } else if (activeFile && activeFile.isBinary) {
        this.editorWrapper.classList.add("hidden");
        this.binaryView.classList.remove("hidden");
        this.previewView.hide();
        this.imageViewContainer.classList.add("hidden");
        if (this.mcpManagerView) this.mcpManagerView.hide();
      } else if (activeFile && activeFile.isBrowser) {
        this.editorWrapper.classList.add("hidden");
        this.binaryView.classList.add("hidden");
        this.previewView.show(activeFile.path);
        this.imageViewContainer.classList.add("hidden");
        if (this.mcpManagerView) this.mcpManagerView.hide();
      } else {
        this.editorWrapper.classList.remove("hidden");
        this.binaryView.classList.add("hidden");
        this.previewView.hide();
        this.imageViewContainer.classList.add("hidden");
        if (this.mcpManagerView) this.mcpManagerView.hide();
      }

      // Restore tabs bar visibility
      this.tabsContainer.style.display = "flex";
    }
  }
  // --- END: MODIFIED RENDER LOGIC ---

  _getLanguageFromPath(filePath) {
    if (!filePath || filePath.startsWith("Untitled-")) return "plaintext";
    const extension = filePath.split(".").pop().toLowerCase();
    switch (extension) {
      case "js":
      case "jsx":
      case "mjs":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "py":
        return "python";
      case "java":
        return "java";
      case "cs":
        return "csharp";
      case "cpp":
      case "cc":
      case "cxx":
      case "h":
      case "hpp":
        return "cpp";
      case "c":
        return "c";
      case "go":
        return "go";
      case "html":
      case "htm":
        return "html";
      case "css":
        return "css";
      case "scss":
      case "less":
        return "scss";
      case "json":
        return "json";
      case "md":
      case "markdown":
        return "markdown";
      case "yml":
      case "yaml":
        return "yaml";
      case "xml":
        return "xml";
      case "sql":
        return "sql";
      case "php":
        return "php";
      case "rb":
        return "ruby";
      case "rs":
        return "rust";
      case "sh":
      case "bash":
        return "shell";
      case "bat":
      case "cmd":
        return "bat";
      case "ps1":
        return "powershell";
      case "dockerfile":
        return "dockerfile";
      default:
        return "plaintext";
    }
  }
  async reloadFile(filePath) {
    // Find if file is open
    const file = this.openFiles.find((f) => f.path === filePath);
    if (!file) return;

    // Read fresh content
    const fileData = await window.electronAPI.readFile(filePath);
    if (fileData && file.model) {
      const currentVal = file.model.getValue();
      if (currentVal !== fileData.content) {
        file.model.setValue(fileData.content);
        file.isDirty = false; // It's saved on disk
        this.tabsBar.render(this.openFiles, this.activeFilePath);
      }
    }
  }

  /** Full source to run when pending AI edits exist (matches editor buffer). */
  getPreviewRunContentForRun(filePath) {
    return this.inlineEditReview?.getPreviewTextForRun?.(filePath) ?? null;
  }

  async setPreviewContent(filePath, content) {
    const file = this.openFiles.find((f) => f.path === filePath);
    if (!file) return;
    if (!file.model) {
      file.model = monaco.editor.createModel(
        content,
        this._getLanguageFromPath(filePath),
      );
      file.isBinary = false;
    }
    this.suppressDirtyTracking = true;
    try {
      file.model.setValue(content);
      if (this.activeFilePath === filePath) {
        this.editor.setModel(file.model);
      }
      file.isDirty = false;
      this.tabsBar.render(this.openFiles, this.activeFilePath);
    } finally {
      this.suppressDirtyTracking = false;
    }
  }

  // --- START: EDITOR ACTIONS FOR MENU ---
  triggerEditorAction(action) {
    if (!this.editor) return;

    switch (action) {
      case "undo":
        this.editor.trigger("keyboard", "undo", null);
        break;
      case "redo":
        this.editor.trigger("keyboard", "redo", null);
        break;
      case "cut":
        this.editor.trigger(
          "keyboard",
          "editor.action.clipboardCutAction",
          null,
        );
        break;
      case "copy":
        this.editor.trigger(
          "keyboard",
          "editor.action.clipboardCopyAction",
          null,
        );
        break;
      case "paste":
        this.editor.trigger(
          "keyboard",
          "editor.action.clipboardPasteAction",
          null,
        );
        break;
      case "find":
        this.editor.trigger("keyboard", "actions.find", null);
        break;
      case "replace":
        this.editor.trigger(
          "keyboard",
          "editor.action.startFindReplaceAction",
          null,
        );
        break;
      case "select-all":
        this.editor.trigger("keyboard", "editor.action.selectAll", null);
        break;
      case "toggle-line-comment":
        this.editor.trigger("keyboard", "editor.action.commentLine", null);
        break;
      case "toggle-block-comment":
        this.editor.trigger("keyboard", "editor.action.blockComment", null);
        break;
      case "command-palette":
        this.editor.trigger("keyboard", "editor.action.quickCommand", null);
        break;
      case "go-to-line":
        this.editor.trigger("keyboard", "editor.action.gotoLine", null);
        break;
      case "go-to-definition":
        this.editor.trigger("keyboard", "editor.action.revealDefinition", null);
        break;
      case "peek-definition":
        this.editor.trigger("keyboard", "editor.action.peekDefinition", null);
        break;
      case "peek-references":
        this.editor.trigger(
          "keyboard",
          "editor.action.referenceSearch.trigger",
          null,
        );
        break;
      case "format-document":
        this.editor.trigger("keyboard", "editor.action.formatDocument", null);
        break;
      case "rename-symbol":
        this.editor.trigger("keyboard", "editor.action.rename", null);
        break;
      case "change-language":
        this.editor.trigger(
          "keyboard",
          "editor.action.changeLanguageMode",
          null,
        );
        break;
    }
  }

  // --- START: HINT WIDGET METHODS ---
  _initHintWidget() {
    const domNode = document.createElement("div");
    domNode.className = "editor-hint-container";
    domNode.innerHTML = `
            <span class="hint-link" id="hint-select-lang">Select a language</span> 
            <span class="hint-keybinding">(Ctrl+K M)</span> to get started. 
            Start typing to dismiss or <span class="hint-link" id="hint-dismiss">don't show this again</span>.
        `;

    // Click listeners
    domNode.querySelector("#hint-select-lang").onclick = (e) => {
      e.stopPropagation();
      this.triggerEditorAction("change-language");
    };

    domNode.querySelector("#hint-dismiss").onclick = (e) => {
      e.stopPropagation();
      this.hideHint();
    };

    this.hintWidget = {
      getId: () => "editor.hint.widget",
      getDomNode: () => domNode,
      getPosition: () => ({
        position: { lineNumber: 1, column: 1 },
        preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
      }),
    };
  }

  showHint() {
    if (!this.isHintVisible && this.hintWidget) {
      this.editor.addContentWidget(this.hintWidget);
      this.isHintVisible = true;
    }
  }

  hideHint() {
    if (this.isHintVisible && this.hintWidget) {
      this.editor.removeContentWidget(this.hintWidget);
      this.isHintVisible = false;
    }
  }
  // --- END: HINT WIDGET METHODS ---
}
