import { explorerState } from '../../views/ExplorerView/explorer-state.js';
import { getIconForFile } from '../../../utils/file-icons.js';
import { contextManager } from '../../../core/ContextManager.js';
import { MentionMenu } from './MentionMenu.js';
import { CodeBlock } from './CodeBlock.js';
import { TerminalBlock } from './TerminalBlock.js';
import { VoiceInput } from './VoiceInput.js';
import { AiEditReviewPanel } from './AiEditReviewPanel.js';
import { initThinkingIndicator } from '../../ai/ThinkingIndicator/thinking.js';

class AiSideBar {
    constructor() {
        this.messages = [];
        this.notificationsEnabled = localStorage.getItem('airgrove_notifications_enabled') === 'true';
        this.thinkingIndicator = null;
        // Load last used model or default to Gemini
        this.currentModel = localStorage.getItem('airgrove_last_model') || 'kimi';
        this.availableModels = [
            { id: 'kimi', name: 'Kimi K2.5', provider: 'nvidia', model: 'moonshotai/kimi-k2.5', icon: '../../assets/modified_icons/kimi.svg' },
            { id: 'nemotron', name: 'Nemotron 120B', provider: 'nvidia', model: 'nvidia/nemotron-3-super-120b-a12b', icon: '../../assets/modified_icons/nvidia.svg' },
            { id: 'gpt-oss', name: 'GPT-OSS 120B', provider: 'nvidia', model: 'openai/gpt-oss-120b', icon: '../../assets/modified_icons/openai.svg' }
        ];
        this.langColors = {
            js: "#f7df1e",
            ts: "#3178c6",
            py: "#3776ab",
            html: "#e34c26",
            css: "#563d7c",
            json: "#cbcb41",
            rs: "#dea584",
            go: "#00add8",
            md: "#083fa1",
            yml: "#cb171e",
            yaml: "#cb171e",
            jsx: "#61dafb",
            tsx: "#3178c6"
        };
        this.isProcessing = false;
        this.terminalBlocks = new Map();
        this.webSearchExpanded = false; // Persistent session state for web search cards

        // DOM elements
        this.contentArea = document.querySelector('.ai-content-area');
        this.emptyState = document.querySelector('.ai-empty-state');
        this.messagesList = document.querySelector('.ai-messages-list');
        this.inputTextarea = document.querySelector('.ai-main-input');
        this.sendButton = document.querySelector('.send-submit-btn');
        this.modelDropdown = document.querySelector('.model-dropdown');

        // Header Buttons
        this.newChatBtn = document.querySelector('.ai-icon-btn[title="New Chat"]');
        this.closeBtn = document.getElementById('close-ai-sidebar-btn');
        this.moreActionsBtn = document.getElementById('ai-more-actions-btn');
        this.mcpDropdownMenu = document.querySelector('.mcp-dropdown-menu');
        this.mcpServerBtn = document.getElementById('mcp-menu-server-btn');

        this.chipModelName = document.querySelector('.ai-chip-model');

        // Mention Menu
        const mentionContainer = document.getElementById('ai-mention-menu');
        if (mentionContainer && this.inputTextarea) {
            this.mentionMenu = new MentionMenu(mentionContainer, this.inputTextarea);
        }

        // Initialize Voice Input
        if (this.inputTextarea) {
            this.voiceInput = new VoiceInput(this.inputTextarea);
        }

        this.attachmentPreview = document.getElementById('ai-attachment-preview');
        this.currentAttachments = []; // Array to store multiple paths

        // Edit Review Panel (Above Input)
        const inputSection = document.querySelector('.ai-input-section');
        if (inputSection) {
            this.editReviewPanel = new AiEditReviewPanel(inputSection);
        }

        this.shouldStickToBottom = true;
        this.scrollInterval = null;
        if (this.messagesList) {
            this.setupScrollListener();
        }

        this.init();
    }

    setupScrollListener() {
        this.messagesList.addEventListener('scroll', () => {
            const threshold = 50; // pixels from bottom
            const isAtBottom = this.messagesList.scrollHeight - this.messagesList.scrollTop - this.messagesList.clientHeight < threshold;
            this.shouldStickToBottom = isAtBottom;
        });
    }

    scrollToBottom() {
        if (this.shouldStickToBottom && this.messagesList) {
            this.messagesList.scrollTop = this.messagesList.scrollHeight;
        }
    }

    createIconElement(iconData) {
        if (iconData.type === 'svg') {
            const img = document.createElement('img');
            img.src = iconData.value;
            img.className = 'file-icon-svg';
            // Explicitly set size for consistency in AI sidebar
            img.style.width = '14px';
            img.style.height = '14px';
            img.style.marginRight = '6px';
            return img;
        } else { // codicon
            const i = document.createElement('i');
            i.className = `codicon ${iconData.value}`;
            i.style.marginRight = '6px';
            i.style.color = '#4daafc';
            return i;
        }
    }

    async init() {
        // Set up event listeners
        this.setupEventListeners();

        // Update model dropdown
        this.updateModelDropdown();

        // Update the dropdown menu with all available models
        this.populateModelMenu();
    }

    toggleNotifications() {
        this.notificationsEnabled = !this.notificationsEnabled;
        localStorage.setItem('airgrove_notifications_enabled', this.notificationsEnabled);

        // Update all bell icons in the UI
        const bellIcons = document.querySelectorAll('.ai-bell-btn img');
        const newIcon = this.notificationsEnabled ? '../../assets/modified_icons/bell.svg' : '../../assets/modified_icons/bell-off.svg';
        bellIcons.forEach(img => {
            img.src = newIcon;
        });

        console.log(`[AI] Notifications ${this.notificationsEnabled ? 'enabled' : 'disabled'}`);
    }

    playNotificationSound() {
        if (!this.notificationsEnabled) return;

        try {
            const audio = new Audio('../../assets/sounds/notification.wav');
            audio.play().catch(err => {
                console.error('[AI] Sound play failed. User may need to interact with the page first.', err);
            });
        } catch (err) {
            console.error('[AI] Error playing notification sound:', err);
        }
    }

    loadModels() {
        console.log('[AI] Using static model list');
    }

    setupEventListeners() {
        // Send button click
        if (this.sendButton) {
            this.sendButton.addEventListener('click', (e) => {
                if (this.voiceInput && (this.voiceInput.isRecording || this.voiceInput.isStopping)) {
                    // Prevent default send, tell VoiceInput to stop and then auto-send
                    e.preventDefault();
                    e.stopPropagation();
                    this.voiceInput.stopRecording(true, true);
                    return;
                }

                if (this.sendButton.classList.contains('stop-btn')) {
                    this.stopGeneration();
                } else {
                    this.sendMessage();
                }
            });
        }

        // Input state monitoring
        if (this.inputTextarea && this.sendButton) {
            this.inputTextarea.addEventListener('input', () => {
                const hasText = this.inputTextarea.value.trim().length > 0;
                this.sendButton.disabled = !hasText;
                this.autoResizeInput();
            });
        }

        // Enter key to send (Shift+Enter for new line)
        if (this.inputTextarea) {
            this.inputTextarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            this.inputTextarea.addEventListener('paste', async (e) => {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (const item of items) {
                    if (item.type.indexOf("image") !== -1) {
                        const blob = item.getAsFile();
                        this.handleImagePaste(blob);
                    }
                }
            });
        }

        // Initial resize for pre-filled text
        if (this.inputTextarea) {
            this.autoResizeInput();
        }

        // New Chat Button
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => {
                this.messages = [];
                if (this.messagesList) this.messagesList.innerHTML = '';
                if (this.emptyState) this.emptyState.classList.remove('hidden');
                if (this.contentArea) this.contentArea.classList.add('empty');

                // Clear backend history
                if (window.electronAPI && window.electronAPI.aiClearHistory) {
                    window.electronAPI.aiClearHistory();
                }
            });
        }

        // Close Button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                // Dispatch event to WorkbenchManager to toggle sidebar visibility
                document.dispatchEvent(new CustomEvent('toggle-secondary-sidebar-triggered'));
            });
        }

        // More Actions Button (Three-dot menu)
        if (this.moreActionsBtn && this.mcpDropdownMenu) {
            this.moreActionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.mcpDropdownMenu.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.moreActionsBtn.contains(e.target) && !this.mcpDropdownMenu.contains(e.target)) {
                    this.mcpDropdownMenu.classList.add('hidden');
                }
            });
        }

        // MCP Server Menu Item Click
        if (this.mcpServerBtn) {
            this.mcpServerBtn.addEventListener('click', () => {
                this.mcpDropdownMenu.classList.add('hidden');
                document.dispatchEvent(new CustomEvent('open-mcp-manager'));
            });
        }

        // Mention Menu Logic
        if (this.inputTextarea && this.mentionMenu) {
            this.inputTextarea.addEventListener('input', () => {
                const value = this.inputTextarea.value;
                const cursor = this.inputTextarea.selectionStart;
                const lastAt = value.lastIndexOf('@', cursor - 1);

                if (lastAt !== -1) {
                    const query = value.substring(lastAt + 1, cursor);
                    if (!query.includes(' ') && !query.includes('\n')) {
                        this.mentionMenu.handleSearch(query);
                        return;
                    }
                }
                this.mentionMenu.hide();
            });

            this.inputTextarea.addEventListener('keydown', (e) => {
                if (this.mentionMenu.active) {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        this.mentionMenu.moveSelection(1);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.mentionMenu.moveSelection(-1);
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        this.mentionMenu.select();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.mentionMenu.hide();
                    }
                }
            });
        }

        // Model dropdown toggle
        if (this.modelDropdown) {
            this.modelDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdownMenu();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            // Close Model Menu
            const modelMenu = document.querySelector('.model-dropdown-menu');
            if (modelMenu && !modelMenu.classList.contains('hidden')) {
                // Determine if click was inside the dropdown logic
                // Actually the modelDropdown listener stops propagation, so any click here is outside
                modelMenu.classList.add('hidden');
            }

            // Close Plus Menu
            const plusMenu = document.querySelector('.plus-dropdown-menu');
            const plusBtn = document.getElementById('ai-plus-btn');
            if (plusMenu && !plusMenu.classList.contains('hidden')) {
                if (!plusMenu.contains(e.target) && !plusBtn.contains(e.target)) {
                    plusMenu.classList.add('hidden');
                }
            }
        });

        // Plus Button Toggle
        const plusBtn = document.getElementById('ai-plus-btn');
        if (plusBtn) {
            plusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const menu = document.querySelector('.plus-dropdown-menu');
                if (menu) menu.classList.toggle('hidden');
            });
        }

        // Plus Menu Items
        const mediaItem = document.getElementById('plus-menu-media');
        if (mediaItem) {
            mediaItem.addEventListener('click', () => {
                console.log('Media clicked'); // Placeholder
                // Logic to add media
                document.querySelector('.plus-dropdown-menu').classList.add('hidden');
            });
        }

        const mentionsItem = document.getElementById('plus-menu-mentions');
        if (mentionsItem) {
            mentionsItem.addEventListener('click', () => {
                // Insert '@' into input
                if (this.inputTextarea) {
                    this.inputTextarea.value += '@';
                    this.inputTextarea.focus();
                    // Trigger input event to show the menu
                    this.inputTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                }
                document.querySelector('.plus-dropdown-menu').classList.add('hidden');
            });
        }

        // --- NEW: Element Selection Listener ---
        document.addEventListener('ai:element-selected', (e) => {
            this.handleElementSelected(e.detail);
        });

        // --- NEW: Inline File Badge Click Delegation ---
        if (this.messagesList) {
            this.messagesList.addEventListener('click', (e) => {
                const badge = e.target.closest('.ai-inline-file-badge');
                if (badge) {
                    const filePath = badge.getAttribute('data-path');
                    if (filePath) {
                        document.dispatchEvent(new CustomEvent('open-file', {
                            detail: { filePath, preview: true }
                        }));
                    }
                }
            });
        }

        // --- START: DRAG AND DROP DROP ZONE ---
        if (this.inputTextarea) {
            this.inputTextarea.addEventListener('dragover', (e) => {
                e.preventDefault(); // Required to allow drop
                e.dataTransfer.dropEffect = 'copy';
                this.inputTextarea.classList.add('drag-over');
            });

            this.inputTextarea.addEventListener('dragleave', () => {
                this.inputTextarea.classList.remove('drag-over');
            });

            this.inputTextarea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.inputTextarea.classList.remove('drag-over');

                const data = e.dataTransfer.getData('text/plain');

                // Also get the raw path if available (from our custom key)
                const filePath = e.dataTransfer.getData('application/airgrove-item-path');

                // Only handle if the dragged data starts with our @ trigger
                if (data.startsWith('@')) {
                    const start = this.inputTextarea.selectionStart;
                    const end = this.inputTextarea.selectionEnd;
                    const text = this.inputTextarea.value;

                    // Insert "@filename " at cursor position
                    const insertion = data + " ";
                    this.inputTextarea.value = text.substring(0, start) + insertion + text.substring(end);

                    // Refocus and place cursor after the inserted text
                    this.inputTextarea.focus();
                    this.inputTextarea.selectionStart = this.inputTextarea.selectionEnd = start + insertion.length;

                    // Manually trigger the 'input' event so any auto-resize or UI logic runs
                    this.inputTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }
        // --- END: DRAG AND DROP DROP ZONE ---
    }

    /**
     * Handles an element selected from the Preview Inspector.
     * @param {object} data - The element data from the inspector.
     */
    handleElementSelected(data) {
        console.log('[AI] Element selected from inspector:', data);

        // Switch to AI Sidebar if not visible
        document.dispatchEvent(new CustomEvent('ensure-secondary-sidebar-visible'));

        // Prepare a message or chip to show that an element is selected
        // For now, let's just insert a mention-like block or text into the input
        if (this.inputTextarea) {
            const tag = data.tagName.toLowerCase();
            const id = data.id ? `#${data.id}` : '';
            const classes = data.className && typeof data.className === 'string'
                ? '.' + data.className.split(' ').filter(c => c).join('.')
                : '';

            const selector = `${tag}${id}${classes}`;

            // Add a visual indicator or just text
            const prefix = this.inputTextarea.value.trim() ? this.inputTextarea.value + '\n\n' : '';
            this.inputTextarea.value = prefix + `Selected element: <${selector}>\n` +
                (data.sourceFile ? `Location: ${data.sourceFile}${data.sourceLine ? ':' + data.sourceLine : ''}\n` : '') +
                `\`\`\`html\n${this._truncateHTML(data.outerHTML)}\n\`\`\``;

            this.inputTextarea.focus();

            // Auto-resize textarea if needed (usually handled by CSS or another listener, but good to trigger)
            this.inputTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    _truncateHTML(html, maxLength = 500) {
        if (html.length <= maxLength) return html;
        // Basic truncation of inner content if too long
        return html.substring(0, maxLength / 2) + '\n... [truncated] ...\n' + html.substring(html.length - maxLength / 2);
    }

    populateModelMenu() {
        const menu = document.querySelector('.model-dropdown-menu');
        if (!menu) return;

        // Clear existing options
        menu.innerHTML = '';

        // Add Header
        const header = document.createElement('div');
        header.className = 'model-menu-header';
        header.textContent = 'Model';
        menu.appendChild(header);

        // Add all available models
        this.availableModels.forEach(model => {
            const option = document.createElement('div');
            option.className = 'model-option';
            if (model.id === this.currentModel) {
                option.classList.add('selected');
            }
            option.setAttribute('data-model-id', model.id);

            const leftGroup = document.createElement('div');
            leftGroup.style.display = 'flex';
            leftGroup.style.alignItems = 'center';
            leftGroup.style.gap = '10px';

            if (model.icon) {
                const img = document.createElement('img');
                img.src = model.icon;
                img.style.width = '16px';
                img.style.height = '16px';
                leftGroup.appendChild(img);
            }

            const span = document.createElement('span');
            span.textContent = model.name;
            leftGroup.appendChild(span);

            option.appendChild(leftGroup);

            // Add checkmark if selected
            if (model.id === this.currentModel) {
                const check = document.createElement('i');
                check.className = 'codicon codicon-check';
                check.style.fontSize = '12px';
                check.style.color = '#4CAF50';
                option.appendChild(check);
            }

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectModel(model.id);
            });

            menu.appendChild(option);
        });
    }

    toggleDropdownMenu() {
        const menu = document.querySelector('.model-dropdown-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }

    selectModel(modelId) {
        if (this.isProcessing) {
            this.stopGeneration();
        }
        this.currentModel = modelId;
        localStorage.setItem('airgrove_last_model', modelId);
        this.updateModelDropdown();

        // Refresh the entire menu to update checkmarks and selection state
        this.populateModelMenu();

        // Close dropdown
        const menu = document.querySelector('.model-dropdown-menu');
        if (menu) {
            menu.classList.add('hidden');
        }

        console.log('[AI] Selected model:', modelId);
    }

    updateModelDropdown() {
        const modelText = document.querySelector('.current-model');
        const modelObj = this.availableModels.find(m => m.id === this.currentModel);
        const modelName = modelObj ? modelObj.name : this.currentModel;

        if (modelText) {
            modelText.innerHTML = '';
            if (modelObj && modelObj.icon) {
                const img = document.createElement('img');
                img.src = modelObj.icon;
                img.className = 'current-model-icon';
                img.style.width = '16px';
                img.style.height = '16px';
                img.style.opacity = '1';
                modelText.appendChild(img);
            }
            const nameSpan = document.createElement('span');
            nameSpan.textContent = modelName;
            modelText.appendChild(nameSpan);
        }

        // Removed: model name from header chip
        if (this.chipModelName) {
            this.chipModelName.textContent = '';
        }

        // Update placeholder - removed model name
        if (this.inputTextarea) {
            this.inputTextarea.placeholder = `Ask anything, @ to mention, /for workflows`;
        }
    }

    async sendMessage() {
        const originalText = this.inputTextarea.value.trim();
        const attachmentsToSend = [...this.currentAttachments];
        if ((!originalText && attachmentsToSend.length === 0) || this.isProcessing) return;

        // Store for potential restoration on "Stop"
        this.lastSentText = originalText;
        this.lastSentAttachments = attachmentsToSend;

        let fullPrompt = originalText || 'Please analyze these images.';
        // If attachments exist, notify the agent to process them one by one
        if (attachmentsToSend.length > 0) {
            let attachmentCtx = "Please analyze the following attached images one by one using the lens_analyze tool before responding:\n";
            attachmentsToSend.forEach((path, idx) => {
                const fileName = path.split(/[\\/]/).pop();
                attachmentCtx += `- Image ${idx + 1}: ${fileName} at ${path}\n`;
            });
            fullPrompt = `${attachmentCtx}\n${originalText || 'Please analyze these images.'}`;
        }

        const requestId = crypto.randomUUID();
        this.currentRequestId = requestId;
        this.isProcessing = true;
        this.activeImageGenRequests = new Set(); // Track pending images to prevent duplicates
        this.currentTurnStartTime = Date.now();
        this.modifiedFilesThisTurn = new Set(); // TRACK MODIFIED FILES THIS TURN

        // Add user message to UI (passing attachments for 66x66 thumbnails)
        this.addMessageToUI('user', originalText || (attachmentsToSend.length > 0 ? '' : ''), attachmentsToSend);
        this.inputTextarea.value = '';
        this.autoResizeInput();
        this.clearAttachments();
        if (this.voiceInput) {
            this.voiceInput.baseText = '';
        }
        this.sendButton.disabled = true;

        // Show thinking state
        this.ensureAssistantMessage();
        this.addThinkingPillToCurrentTurn();
        this.updateSendButtonState(true);

        this.currentFullContent = '';
        let contentDiv = null;

        // --- Agent Activity Timeline (Cursor-style, always visible) ---
        let activityTimeline = null;  // The flat wrapper div
        let activityList = null;      // The <ul> inside it
        let activityStepCount = 0;
        let lastActivityItem = null;  // Tracks the last open (pending) step

        const ensureTimeline = () => {
            if (!activityTimeline && this.currentAssistantMessageDiv) {
                activityTimeline = document.createElement('div');
                activityTimeline.className = 'ag-activity-timeline';

                activityList = document.createElement('ul');
                activityList.className = 'ag-activity-list';
                activityTimeline.appendChild(activityList);

                // Insert timeline in chronological order (append instead of prepend)
                const bubble = this.currentAssistantMessageDiv.querySelector('.ai-message-bubble');
                if (bubble) {
                    bubble.appendChild(activityTimeline);
                } else {
                    this.currentAssistantMessageDiv.appendChild(activityTimeline);
                }
            }
        };

        const addActivityStep = (icon, label, detail, status = 'running', diff = null, filePath = null) => {
            ensureTimeline();
            activityStepCount++;
            const li = document.createElement('li');
            li.className = `ag-activity-step ag-step-${status}`;

            let fileBadgeHtml = '';
            if (filePath) {
                const fname = filePath.split(/[\\/]/).pop();
                const isFolder = !fname.includes('.');
                let badgeIconSrc;
                if (isFolder) {
                    badgeIconSrc = '../../assets/modified_icons/folder.svg';
                } else {
                    const iconData = getIconForFile(fname);
                    badgeIconSrc = iconData.value;
                }
                // Creating a badge element for the filename + icon
                fileBadgeHtml = `
                    <div class="ag-file-badge" title="${isFolder ? 'Folder' : 'Click to open'}: ${fname}">
                        <img src="${badgeIconSrc}" class="ag-file-icon">
                        <span class="ag-file-name">${fname}</span>
                    </div>
                `;
            }

            let diffHtml = '';
            if (diff && status === 'done') {
                diffHtml = `<span class="ag-step-diff"><span class="ag-diff-added">+${diff.added}</span><span class="ag-diff-removed">-${diff.removed}</span></span>`;
            }

            let badgeHtml = (status === 'running') ? '<span class="ag-terminal-spinner" title="Running" style="vertical-align: middle;"></span>' : `<img src="../../assets/modified_icons/circle-check.svg" style="width:14px; height:14px; vertical-align: middle;">`;
            let badgeClass = (status === 'running') ? '' : 'ag-badge-done';

            if (status === 'done') {
                if (label === 'Failed') {
                    icon = `<img src="../../assets/modified_icons/issue.svg" style="width:14px; height:14px;">`;
                    badgeHtml = `<img src="../../assets/modified_icons/fail.svg" style="width:14px; height:14px; vertical-align: middle;">`;
                    badgeClass = 'ag-badge-failed';
                } else if (label === 'Created' || label === 'Edited') {
                    badgeHtml = `<img src="../../assets/modified_icons/file-diff.svg" style="width:14px; height:14px; vertical-align: middle;">`;
                }
            }

            const rangeHtml = (label === 'Analyzing' || label === 'Analyzed') && detail ? `<span class="ag-range-pill">${detail}</span>` : '';
            const otherDetailHtml = (label !== 'Analyzing' && label !== 'Analyzed') && detail ? `<span class="ag-step-detail">${detail}</span>` : '';

            li.innerHTML = `
                <span class="ag-step-icon">${icon}</span>
                <span class="ag-step-label">${label}</span>
                ${otherDetailHtml}
                ${fileBadgeHtml}
                ${rangeHtml}
                ${diffHtml}
                <span class="ag-step-badge ${badgeClass}">${badgeHtml}</span>
            `;

            // Attach listener ONLY to the file badge if it exists
            const badge = li.querySelector('.ag-file-badge');
            if (badge && filePath) {
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('open-file', {
                        detail: { filePath, preview: true }
                    }));
                });
            }

            activityList.appendChild(li);
            li.dataset.icon = icon; // Store icon for reliable recovery in resolveLastStep
            lastActivityItem = li;
            this.messagesList.scrollTop = this.messagesList.scrollHeight;
            return li;
        };

        const resolveLastStep = (detail, result, diff = null, filePath = null, labelOverride = null, isSuccess = true) => {
            if (lastActivityItem) {
                lastActivityItem.classList.remove('ag-step-running');
                lastActivityItem.classList.add('ag-step-done');
                const badge = lastActivityItem.querySelector('.ag-step-badge');

                const labelEl = lastActivityItem.querySelector('.ag-step-label');
                const iconEl = lastActivityItem.querySelector('.ag-step-icon');
                if (labelEl && labelOverride) {
                    labelEl.innerHTML = labelOverride;
                }
                if (!isSuccess) {
                    if (labelEl) labelEl.style.color = '#fa7e7e'; // red
                    if (iconEl) {
                        iconEl.innerHTML = `<img src="../../assets/modified_icons/issue.svg" style="width:14px; height:14px;">`;
                    }
                }
                const label = labelEl?.innerHTML || '';

                let doneBadgeHtml = `<img src="../../assets/modified_icons/circle-check.svg" style="width:14px; height:14px; vertical-align: middle;">`;
                let doneBadgeClass = 'ag-badge-done';
                if (!isSuccess) {
                    doneBadgeHtml = `<img src="../../assets/modified_icons/fail.svg" style="width:14px; height:14px; vertical-align: middle;">`;
                    doneBadgeClass = 'ag-badge-failed';
                } else if (label === 'Created' || label === 'Edited') {
                    doneBadgeHtml = `<img src="../../assets/modified_icons/file-diff.svg" style="width:14px; height:14px; vertical-align: middle;">`;
                }

                if (badge) {
                    badge.className = `ag-step-badge ${doneBadgeClass}`;
                    badge.innerHTML = doneBadgeHtml;
                }

                // If we have a filePath, update the innerHTML to include a badge
                if (filePath) {
                    const fname = filePath.split(/[\\/]/).pop();
                    const isFolder = !fname.includes('.');
                    const badgeIconSrc = isFolder
                        ? '../../assets/modified_icons/folder.svg'
                        : getIconForFile(fname).value;

                    let diffHtml = '';
                    if (diff) {
                        diffHtml = `<span class="ag-step-diff"><span class="ag-diff-added">+${diff.added}</span><span class="ag-diff-removed">-${diff.removed}</span></span>`;
                    }

                    const rangeHtml = detail ? `<span class="ag-range-pill">${detail}</span>` : '';

                    lastActivityItem.innerHTML = `
                        <span class="ag-step-icon">${lastActivityItem.dataset.icon || lastActivityItem.querySelector('.ag-step-icon').innerHTML}</span>
                        <span class="ag-step-label">${label}</span>
                        <div class="ag-file-badge" title="${isFolder ? 'Folder' : 'Click to open'}: ${fname}">
                            <img src="${badgeIconSrc}" class="ag-file-icon">
                            <span class="ag-file-name">${fname}</span>
                        </div>
                        ${rangeHtml}
                        ${diffHtml}
                        <span class="ag-step-badge ${doneBadgeClass}">${doneBadgeHtml}</span>
                    `;


                    const fileBadge = lastActivityItem.querySelector('.ag-file-badge');
                    if (fileBadge) {
                        fileBadge.addEventListener('click', (e) => {
                            e.stopPropagation();
                            document.dispatchEvent(new CustomEvent('open-file', {
                                detail: { filePath, preview: true }
                            }));
                        });
                    }
                } else { // Original logic for non-file steps
                    const detailEl = lastActivityItem.querySelector('.ag-step-detail');
                    if (detailEl && detail) {
                        detailEl.innerHTML = detail;
                        detailEl.style.display = ''; // Ensure it is visible
                    }

                    if (diff) {
                        const diffHtml = `<span class="ag-step-diff"><span class="ag-diff-added">+${diff.added}</span><span class="ag-diff-removed">-${diff.removed}</span></span>`;
                        const div = document.createElement('div');
                        div.innerHTML = diffHtml;
                        const diffEl = div.firstChild;
                        lastActivityItem.insertBefore(diffEl, badge);
                    }
                }

                lastActivityItem = null;
            }
        };



        const cleanup = () => {
            window.electronAPI.offAiChunk(requestId, chunkListener);
            window.electronAPI.offAiDone(requestId, doneListener);
            window.electronAPI.offAiError(requestId, errorListener);
            window.electronAPI.offAiToolStart(requestId, toolStartListener);
            window.electronAPI.offAiToolUpdate(requestId, toolUpdateListener);
            window.electronAPI.offAiToolResult(requestId, toolResultListener);
            window.electronAPI.offAiStatus(requestId, statusListener);
            this.isProcessing = false;
            this.currentRequestId = null;
            if (this.activeImageGenRequests) this.activeImageGenRequests.clear();
            this.updateSendButtonState(false);

            // We want the terminal output to REMAIN visible in the chat 
            // so we DO NOT dispose it.
        };

        this.activeCleanup = cleanup;

        const chunkListener = window.electronAPI.onAiChunk(requestId, (chunk) => {
            if (this.currentRequestId !== requestId) return;

            if (!contentDiv) {
                this.removeThinkingPillFromCurrentTurn();
                contentDiv = document.createElement('div');
                contentDiv.className = 'ai-message-content ai-markdown-content';

                const bubble = this.currentAssistantMessageDiv.querySelector('.ai-message-bubble');
                if (bubble) {
                    // Always append content AFTER the timeline
                    bubble.appendChild(contentDiv);
                } else {
                    this.currentAssistantMessageDiv.appendChild(contentDiv);
                }
            }

            this.currentFullContent += chunk;

            // Add file badge if there is a context file association
            if (this.currentFullContent.length === chunk.length) {
                const activeFile = this.currentAssistantMessageDiv.dataset?.activeFile;
                if (activeFile) {
                    const badge = this.renderFileBadge(activeFile.split('/').pop(), '');
                    contentDiv.insertBefore(badge, contentDiv.firstChild);
                }
            }

            contentDiv.innerHTML = this.formatMessage(this.currentFullContent);

            const isAtBottom = (this.messagesList.scrollHeight - this.messagesList.scrollTop - this.messagesList.clientHeight) <= 100;
            if (isAtBottom) {
                this.messagesList.scrollTop = this.messagesList.scrollHeight;
            }
        });

        const doneListener = window.electronAPI.onAiDone(requestId, () => {
            if (this.currentRequestId !== requestId) return;

            this.removeThinkingPillFromCurrentTurn();

            this.renderActions(this.currentAssistantMessageDiv, this.currentFullContent);
            this.messages.push({ role: 'assistant', content: this.currentFullContent });
            this.currentAssistantMessageDiv = null;

            document.dispatchEvent(new CustomEvent('ai-response-complete'));
            this.playNotificationSound();

            this.messagesList.scrollTop = this.messagesList.scrollHeight;
            cleanup();
        });

        const errorListener = window.electronAPI.onAiError(requestId, (error) => {
            if (this.currentRequestId !== requestId) return;

            this.removeThinkingPillFromCurrentTurn();

            // If it was an "aborted" error, we don't need to show a red error div 
            // since stopGeneration already cleaned the UI.
            if (error.toLowerCase().includes('aborted') || error.toLowerCase().includes('canceled')) {
                document.dispatchEvent(new CustomEvent('ai-response-complete'));
                cleanup();
                return;
            }

            const errorDiv = document.createElement('div');
            errorDiv.className = 'ai-error-message';
            errorDiv.textContent = `Error: ${error}`;
            if (this.currentAssistantMessageDiv) {
                this.currentAssistantMessageDiv.appendChild(errorDiv);
            }

            document.dispatchEvent(new CustomEvent('ai-response-complete'));

            this.currentAssistantMessageDiv = null;
            cleanup();
        });

        // -----------------------------------------------------------------------
        const statusListener = window.electronAPI.onAiStatus(requestId, (data) => {
            if (this.currentRequestId !== requestId) return;
            const { message, requiresPermission } = data;

            if (requiresPermission) {
                this.removeThinkingPillFromCurrentTurn();
                const statusDiv = document.createElement('div');
                statusDiv.className = 'ai-status-checkpoint';
                statusDiv.innerHTML = `
                    <div class="ai-status-msg">${message}</div>
                    <div style="display: flex; gap: 8px; margin-top: 4px;">
                        <button class="ai-continue-btn">Continue</button>
                        <button class="ai-abort-btn">No, Stop Here</button>
                    </div>
                `;

                const bubble = this.currentAssistantMessageDiv.querySelector('.ai-message-bubble');
                (bubble || this.currentAssistantMessageDiv).appendChild(statusDiv);

                statusDiv.querySelector('.ai-continue-btn').addEventListener('click', () => {
                    statusDiv.remove();
                    this.addThinkingPillToCurrentTurn(); // Back to work
                    window.electronAPI.aiContinue(requestId);
                });

                statusDiv.querySelector('.ai-abort-btn').addEventListener('click', () => {
                    this.stopGeneration();
                });

                this.messagesList.scrollTop = this.messagesList.scrollHeight;
            }
        });

        // TOOL EVENT HANDLERS — populate the TIMELINE only (no inline tool cards)
        const toolStartListener = window.electronAPI.onAiToolStart(requestId, (data) => {
            if (this.currentRequestId !== requestId) return;
            this.removeThinkingPillFromCurrentTurn();

            const { name, args, toolCallId = crypto.randomUUID() } = data;
            let icon = '🔍';
            let label = 'Running';
            let detail = '';

            if (name === 'terminal_run') {
                // Removing timeline activity step because terminal block handles it.

                // Force subsequent regular tool step events into a FRESH timeline block
                // so we never break exact chronological rendering flow!
                activityTimeline = null;
                activityList = null;

                // Create a div for the live terminal output in the current assistant message
                const terminalDiv = document.createElement('div');
                terminalDiv.className = 'ag-terminal-block';

                const bubble = this.currentAssistantMessageDiv.querySelector('.ai-message-bubble');
                if (bubble) {
                    bubble.appendChild(terminalDiv);
                } else {
                    this.currentAssistantMessageDiv.appendChild(terminalDiv);
                }

                // Initialize terminal block
                const resolvedCwd = args.cwd || explorerState.fileTree?.path || explorerState.getRootPath() || '';
                const termBlock = new TerminalBlock(terminalDiv, {
                    command: args.command,
                    cwd: resolvedCwd,
                    onCancel: () => this.stopGeneration()
                });
                this.terminalBlocks.set(toolCallId, termBlock);

            } else if (name === 'glob_tool' || name === 'search_files') {
                icon = '<img src="../../assets/modified_icons/Search.svg" class="ag-step-icon-img">';
                label = 'Searching';
                detail = args.pattern ? `"${args.pattern}"` : (args.query || '');
                addActivityStep(icon, label, detail, 'running');
            } else if (name === 'grep_tool') {
                icon = '<img src="../../assets/modified_icons/search-code.svg" class="ag-step-icon-img">';
                label = 'Scanning';
                detail = `"${args.pattern || ''}"`;
                addActivityStep(icon, label, detail, 'running');
            } else if (name === 'web_search' || name === 'web_scraper') {
                icon = '<img src="../../assets/modified_icons/globe.svg" class="ag-step-icon-img">';
                const modeLabel = name === 'web_scraper' ? (args.mode === 'crawl' ? 'Crawling' : (args.mode === 'extract' ? 'Extracting' : 'Scraping')) : 'Searching for';
                label = modeLabel;
                const queryOrUrl = args.query || args.url || '';
                const words = queryOrUrl.split(/\s+/).filter(Boolean);
                const truncatedQuery = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
                detail = `<span class="ag-web-query">"${truncatedQuery}"</span> <span class="ag-loading-dots"></span>`;
                addActivityStep(icon, label, detail, 'running');
            } else if (name === 'read_file') {
                const fname = (args.filePath || '').split(/[\\/]/).pop();
                const s = args.offset || 1;
                const e = args.limit ? (s + args.limit - 1) : 0; // 0 means unknown/rest
                let range = '';
                if (args.limit) {
                    range = (s === e) ? `#${s}` : `#${s}-${e}`;
                } else if (args.offset > 1) {
                    range = `#${s}-...`;
                }
                icon = '<img src="../../assets/modified_icons/file.svg" class="ag-step-icon-img">';
                label = 'Analyzing';
                addActivityStep(icon, label, range, 'running', null, args.filePath);
            } else if (name === 'lens_analyze') {
                icon = '<img src="../../assets/modified_icons/vision_scan.svg" style="width: 14px; height: 14px;">';
                label = 'AuraScanning';
                addActivityStep(icon, label, '', 'running', null, args.imagePath);
            } else if (name === 'write_file' || name === 'create_file' || name === 'create_directory') {
                const fname = (args.filePath || args.path || '').split(/[\\/]/).pop();
                icon = '<img src="../../assets/modified_icons/edit.svg" class="ag-step-icon-img">';
                label = name === 'create_directory' ? 'Creating Folder' : 'Creating';
                addActivityStep(icon, label, '', 'running', null, args.filePath || args.path);
            } else if (name === 'edit_file' || name === 'replace_file_content' || name === 'multi_replace_file_content') {
                icon = '<img src="../../assets/modified_icons/edit.svg" class="ag-step-icon-img">';
                label = 'Editing';
                // One pending step per unique file
                const editPaths = [...new Set((args.edits || []).map(e => e.filePath).filter(Boolean))];
                if (editPaths.length === 0 && args.filePath) editPaths.push(args.filePath);

                if (editPaths.length === 0) {
                    addActivityStep(icon, label, '', 'running');
                } else {
                    editPaths.forEach(fp => {
                        addActivityStep(icon, label, '', 'running', null, fp);
                    });
                }
            } else if (name === 'imageGen_tool') {
                const fileName = args.image_name || "image.png";
                const imageKey = `${requestId}-${fileName}`;

                // ✅ Check if this image is already being generated
                if (this.activeImageGenRequests?.has(imageKey)) {
                    console.log(`[ImageGen] Duplicate request detected for ${fileName}, ignoring UI render...`);
                    return; // Prevent duplicate UI step
                }
                this.activeImageGenRequests?.add(imageKey);

                icon = '<img src="../../assets/modified_icons/palette.svg" style="width: 14px; height: 14px;">';
                label = 'Generating';
                // Use a file badge from the start to anchor the filename
                const step = addActivityStep(icon, label, '', 'running', null, fileName);
                if (step) step.classList.add('ag-step-image-gen');
            } else if (name === 'list_directory') {
                icon = '<img src="../../assets/modified_icons/route.svg" class="ag-step-icon-img">';
                label = 'Exploring';
                addActivityStep(icon, label, '', 'running', null, args.path);
            } else if (name === 'delete_file') {
                const targetPath = args.path || '';
                const isFolderGuess = !targetPath.includes('.') || targetPath.endsWith('/') || targetPath.endsWith('\\');
                icon = '<img src="../../assets/modified_icons/trash.svg" class="ag-step-icon-img">';
                label = isFolderGuess ? 'Deleting folder' : 'Deleting file';
                addActivityStep(icon, label, '', 'running', null, targetPath);
            } else {
                icon = '<img src="../../assets/modified_icons/sparkle.svg" class="ag-step-icon-img">';
                label = name.replace(/_/g, ' '); detail = '';
                addActivityStep(icon, label, detail, 'running');
            }
            this.messagesList.scrollTop = this.messagesList.scrollHeight;
        });

        const toolUpdateListener = window.electronAPI.onAiToolUpdate(requestId, (data) => {
            if (this.currentRequestId !== requestId) return;
            const { name, output, toolCallId, spawnCwd } = data;

            if (name === 'terminal_run' && toolCallId && this.terminalBlocks.has(toolCallId)) {
                const block = this.terminalBlocks.get(toolCallId);
                // On first data, update title with the resolved absolute cwd
                if (spawnCwd && block.updateTitle) block.updateTitle(spawnCwd);
                block.write(output);
            }
        });

        const toolResultListener = window.electronAPI.onAiToolResult(requestId, (data) => {
            if (this.currentRequestId !== requestId) return;

            const { name, args = {}, result, data: resultData, toolCallId } = data;
            let resolvedDetail = '';

            if (name === 'terminal_run') {
                const cmd = args.command || '';
                const code = resultData?.exitCode;
                // No need to call resolveLastStep since we didn't add one.

                // Signal terminal block that command is done (hides spinner + cancel)
                if (toolCallId && this.terminalBlocks.has(toolCallId)) {
                    this.terminalBlocks.get(toolCallId).setExitCode(code !== undefined ? code : -1);
                }
            } else if (name === 'glob_tool' || name === 'search_files' || name === 'grep_tool') {
                const query = (args.pattern || args.query) ? `"${args.pattern || args.query}"` : '';
                const count = resultData ? (Array.isArray(resultData) ? resultData.length : (resultData.results ? resultData.results.length : 0)) : 0;
                resolvedDetail = `${query} • ${count} ${name === 'grep_tool' ? 'match' : 'file'}${count !== 1 ? (name === 'grep_tool' ? 'es' : 's') : ''} found`;

                // Show files as sub-items in the timeline list
                if (resultData && resultData.length > 0 && activityList) {
                    const fileList = document.createElement('li');
                    fileList.className = 'ag-activity-step ag-step-files';
                    const fileRows = resultData.slice(0, 8).map(f => {
                        const iconData = getIconForFile(f.name);
                        return `<span class="ag-file-row" data-path="${f.fullPath}">
                            <img src="${iconData.value}" class="ag-file-icon">
                            <span class="ag-file-name">${f.path}</span>
                        </span>`;
                    }).join('');
                    fileList.innerHTML = `<div class="ag-file-rows">${fileRows}</div>`;
                    activityList.appendChild(fileList);

                    fileList.querySelectorAll('.ag-file-row').forEach(row => {
                        row.addEventListener('click', () => {
                            document.dispatchEvent(new CustomEvent('open-file', {
                                detail: { filePath: row.dataset.path, preview: true }
                            }));
                        });
                    });
                }

            } else if (name === 'web_search' || name === 'web_scraper') {
                let results = [];
                let count = 0;
                let summaryText = '';
                let statusLabel = 'Searched for';

                if (name === 'web_search') {
                    results = (resultData && Array.isArray(resultData.results)) ? resultData.results : (Array.isArray(resultData) ? resultData : []);
                    count = results.length;
                    summaryText = `${count} results found`;
                } else {
                    // Firecrawl
                    if (args.mode === 'crawl') {
                        results = (resultData && Array.isArray(resultData.data)) ? resultData.data : [];
                        count = results.length;
                        summaryText = `${count} pages crawled`;
                        statusLabel = 'Crawled';
                    } else if (args.mode === 'extract') {
                        results = resultData && resultData.data ? [resultData.data] : [];
                        count = results.length;
                        summaryText = `UI structure extracted`;
                        statusLabel = 'Extracted';
                    } else {
                        // Scrape
                        results = resultData && resultData.data ? [resultData.data] : [];
                        count = results.length;
                        summaryText = `Content scraped`;
                        statusLabel = 'Scraped';
                    }
                }

                const queryOrUrl = args.query || args.url || '';
                const queryLabel = queryOrUrl ? (queryOrUrl.split(' ').slice(0, 4).join(' ') + (queryOrUrl.split(' ').length > 4 ? '...' : '')) : 'Search';

                const statusLi = lastActivityItem;
                resolveLastStep(`<span class="ag-web-query">"${queryLabel}"</span> • ${summaryText}`, result, null, null, statusLabel);

                if (count > 0 && statusLi) {
                    statusLi.classList.add('ag-web-expandable');
                    const badge = statusLi.querySelector('.ag-step-badge');
                    if (badge) {
                        badge.className = 'ag-step-badge ag-badge-web-toggle';
                        badge.innerHTML = `<i class="codicon codicon-chevron-${this.webSearchExpanded ? 'down' : 'right'}"></i>`;
                        badge.title = this.webSearchExpanded ? 'Collapse results' : 'Expand results';
                    }

                    const listContainer = document.createElement('div');
                    listContainer.className = `ag-web-results-inline ${this.webSearchExpanded ? '' : 'hidden'}`;

                    if (name === 'web_search' || (name === 'web_scraper' && args.mode === 'crawl')) {
                        // Multiple entries (Tavily results or Firecrawl crawl data)
                        results.slice(0, 5).forEach(res => {
                            const row = document.createElement('div');
                            row.className = 'ai-web-result-row';
                            const targetUrl = res.url || res.url || '';
                            let domain = '';
                            try { domain = new URL(targetUrl).hostname; } catch (e) { }

                            row.innerHTML = `
                                <img src="https://www.google.com/s2/favicons?sz=64&domain_url=${domain}" class="ai-web-favicon">
                                <div class="ai-web-result-info">
                                    <span class="ai-web-result-name">${res.title || res.metadata?.title || 'Untitled'}</span>
                                    <span class="ai-web-result-url">${targetUrl}</span>
                                </div>
                                <span class="ai-web-result-open">
                                    <img src="../../assets/modified_icons/open-browser.svg" style="width:14px; opacity:0.8;">
                                </span>
                            `;
                            row.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (window.electronAPI && window.electronAPI.openExternal) {
                                    window.electronAPI.openExternal(targetUrl);
                                }
                            });
                            listContainer.appendChild(row);
                        });

                        if (count > 5) {
                            const more = document.createElement('div');
                            more.className = 'ai-web-more';
                            more.textContent = `+ ${count - 5} more results`;
                            listContainer.appendChild(more);
                        }
                    } else {
                        // Single entry (Scrape or Extract)
                        const row = document.createElement('div');
                        row.className = 'ai-web-result-row';
                        const res = results[0];
                        const targetUrl = args.url || '';
                        let domain = '';
                        try { domain = new URL(targetUrl).hostname; } catch (e) { }

                        row.innerHTML = `
                            <img src="https://www.google.com/s2/favicons?sz=64&domain_url=${domain}" class="ai-web-favicon">
                            <div class="ai-web-result-info">
                                <span class="ai-web-result-name">${args.mode === 'extract' ? 'Structural UI Data' : (res.metadata?.title || 'Scraped Content')}</span>
                                <span class="ai-web-result-url">${args.mode === 'extract' ? 'Extracted components ready for consumption' : targetUrl}</span>
                            </div>
                            <span class="ai-web-result-open">
                                <img src="../../assets/modified_icons/open-browser.svg" style="width:14px; opacity:0.8;">
                            </span>
                        `;
                        row.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (window.electronAPI && window.electronAPI.openExternal) {
                                window.electronAPI.openExternal(targetUrl);
                            }
                        });
                        listContainer.appendChild(row);
                    }

                    statusLi.appendChild(listContainer);

                    statusLi.addEventListener('click', (e) => {
                        const isHidden = listContainer.classList.toggle('hidden');
                        this.webSearchExpanded = !isHidden;
                        const icon = statusLi.querySelector('.ag-badge-web-toggle i');
                        if (icon) {
                            icon.className = `codicon codicon-chevron-${this.webSearchExpanded ? 'down' : 'right'}`;
                        }
                    });
                }
            } else if (name === 'read_file') {
                const range = resultData?.rangeDisplay || '';
                resolveLastStep(range, result, null, args.filePath, 'Analyzed');
            } else if (name === 'write_file') {
                const fname = (args.filePath || '').split(/[\\/]/).pop();
                resolvedDetail = `<span class="ag-file-name">${fname}</span>`;
                const diff = resultData ? { added: resultData.added || 0, removed: resultData.removed || 0 } : null;
                const finalLabel = resultData && resultData.action === 'edited' ? 'Edited' : 'Created';
                resolveLastStep('', result, diff, args.filePath, finalLabel);

                // Auto-open in editor
                if (resultData && resultData.filePath) {
                    this.modifiedFilesThisTurn.add(resultData.filePath); // TRACK IT

                    const activeFile = window.editorGroup?.openFiles.find(f => f.path === window.editorGroup.activeFilePath);
                    const isPreviewActive = activeFile && (activeFile.isBrowser || activeFile.path?.match(/^(https?|preview|http):\/\//));

                    document.dispatchEvent(new CustomEvent('open-file', {
                        detail: {
                            filePath: resultData.filePath,
                            preview: false,
                            noFocus: !!isPreviewActive
                        }
                    }));
                }

                if (resultData && resultData.sessionId) {
                    document.dispatchEvent(new CustomEvent('ai-edit-review-start', {
                        detail: { sessionId: resultData.sessionId }
                    }));
                }

                this.addThinkingPillToCurrentTurn();
                this.messagesList.scrollTop = this.messagesList.scrollHeight;
                return; // skip general resolution below
            } else if (name === 'edit_file') {
                // --- Per-file rows (replaces all pending edit steps) ---
                const editResults = (resultData && resultData.results) ? resultData.results : [];
                const sessionId = resultData?.sessionId;
                const seen = new Set();
                const unique = editResults.filter(r => { if (seen.has(r.filePath)) return false; seen.add(r.filePath); return true; });

                const activeFileAtStart = window.editorGroup?.openFiles.find(f => f.path === window.editorGroup.activeFilePath);
                const isPreviewActive = activeFileAtStart && (activeFileAtStart.isBrowser || activeFileAtStart.path?.match(/^(https?|preview|http):\/\//));

                // Remove ALL pending (running) edit steps that were added at toolStart
                if (activityList) {
                    activityList.querySelectorAll('.ag-step-running').forEach(el => el.remove());
                    lastActivityItem = null;
                }

                // Add one resolved step per file
                unique.forEach(r => {
                    const fname = (r.filePath || '').split(/[\\/]/).pop();
                    const fileIcon = `<img src="../../assets/modified_icons/edit.svg" class="ag-step-icon-img">`;
                    const fileLabel = r.action === 'created' ? 'Created' : 'Edited';
                    if (r.success) {
                        this.modifiedFilesThisTurn.add(r.filePath); // TRACK IT
                        const diff = {
                            added: (r.hunks || []).reduce((n, h) => n + (h.added?.length || 0), 0),
                            removed: (r.hunks || []).reduce((n, h) => n + (h.removed?.length || 0), 0)
                        };
                        addActivityStep(fileIcon, fileLabel, '', 'done', diff, r.filePath);

                        // Auto-open in editor
                        document.dispatchEvent(new CustomEvent('open-file', {
                            detail: {
                                filePath: r.filePath,
                                preview: false,
                                noFocus: !!isPreviewActive
                            }
                        }));
                    } else {
                        addActivityStep('❌', 'Failed', fname, 'done');
                    }
                });

                if (sessionId) {
                    document.dispatchEvent(new CustomEvent('ai-edit-review-start', {
                        detail: { sessionId }
                    }));
                }

                // Nothing left to resolve (steps already set to done above)
                this.addThinkingPillToCurrentTurn();
                this.messagesList.scrollTop = this.messagesList.scrollHeight;
                return; // skip the resolveLastStep below
            } else if (name === 'imageGen_tool') {
                const fname = resultData?.fileName || 'image.png';
                const imageKey = `${requestId}-${fname}`;
                if (this.activeImageGenRequests) {
                    this.activeImageGenRequests.delete(imageKey);
                }

                if (lastActivityItem) lastActivityItem.classList.add('ag-step-image-gen');

                const isSuccess = resultData && resultData.filePath;
                if (!isSuccess) {
                    const errorMsg = result || 'Image generation failed';
                    resolveLastStep('', errorMsg, null, null, 'Failed', false);
                    return;
                }

                const ok = (resultData && resultData.success !== undefined) ? resultData.success : true;
                resolveLastStep('', result, null, resultData?.filePath, 'Generated', ok);

                // Auto-open generated image in the tab system (with preview tab check)
                if (resultData && resultData.filePath) {
                    const activeFile = window.editorGroup?.openFiles.find(f => f.path === window.editorGroup.activeFilePath);
                    const isPreviewActive = activeFile && (activeFile.isBrowser || activeFile.path?.match(/^(https?|preview|http):\/\//));

                    document.dispatchEvent(new CustomEvent('open-file', {
                        detail: {
                            filePath: resultData.filePath,
                            preview: false,
                            noFocus: !!isPreviewActive
                        }
                    }));
                }

                // Show the generated image in the chat!
                if (resultData && resultData.filePath) {
                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'ai-generated-image-container';
                    imgDiv.innerHTML = `
                        <div class="ai-generated-image-wrapper">
                            <img src="file://${resultData.filePath.replace(/\\/g, '/')}" class="ai-generated-image">
                            <div class="ai-image-overlay">
                                <span class="ai-image-info">${resultData.width}x${resultData.height}</span>
                            </div>
                        </div>
                    `;
                    imgDiv.onclick = () => {
                        document.dispatchEvent(new CustomEvent('open-file', {
                            detail: { filePath: resultData.filePath, preview: false }
                        }));
                    };

                    if (this.currentAssistantMessageDiv) {
                        const bubble = this.currentAssistantMessageDiv.querySelector('.ai-message-bubble');
                        if (bubble) bubble.appendChild(imgDiv);
                    }
                }

                this.addThinkingPillToCurrentTurn();
                this.messagesList.scrollTop = this.messagesList.scrollHeight;
                return; // skip default resolution below

            } else if (name === 'lens_analyze') {
                const fpath = args.imagePath || resultData?.path;
                const fname = (fpath || '').split(/[\\/]/).pop();
                resolveLastStep('', result, null, fpath, 'AuraScanned');

                // If it's a vision analysis, show the image being analyzed
                if (fpath) {
                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'ai-analyzed-image-container';
                    imgDiv.innerHTML = `
                        <div class="ai-generated-image-wrapper analyzed-preview">
                            <img src="file://${fpath.replace(/\\/g, '/')}" class="ai-generated-image">
                            <div class="ai-image-overlay">
                                <span class="ai-image-info">Analyzed: ${fname}</span>
                            </div>
                        </div>
                    `;
                    imgDiv.onclick = () => {
                        document.dispatchEvent(new CustomEvent('open-file', {
                            detail: { filePath: fpath, preview: true }
                        }));
                    };

                    if (this.currentAssistantMessageDiv) {
                        const bubble = this.currentAssistantMessageDiv.querySelector('.ai-message-bubble');
                        if (bubble) bubble.appendChild(imgDiv);
                    }
                }
                this.addThinkingPillToCurrentTurn();
                this.messagesList.scrollTop = this.messagesList.scrollHeight;
            } else if (name === 'list_directory') {
                const count = resultData?.itemCount || 0;
                resolveLastStep(`${count} item${count !== 1 ? 's' : ''} found`, result, null, args.path, 'Explored');
                this.addThinkingPillToCurrentTurn();
                return;
            } else if (name === 'delete_file') {
                const type = (resultData && resultData.type) || 'file';
                const method = (resultData && resultData.method === 'permanent_delete') ? '[Permanent]' : '[Trash]';
                const labelOverride = type === 'folder' ? 'Deleted folder' : 'Deleted file';
                const iconOverride = '<img src="../../assets/modified_icons/trash.svg" class="ag-step-icon-img">';

                if (lastActivityItem) {
                    const iconEl = lastActivityItem.querySelector('.ag-step-icon');
                    if (iconEl) iconEl.innerHTML = iconOverride;
                    lastActivityItem.dataset.icon = iconOverride;
                }

                resolveLastStep(method, result, null, null, labelOverride);
                this.addThinkingPillToCurrentTurn();
                return;
            } else {
                resolvedDetail = result ? result.substring(0, 60) : '';
            }

            const isSuccess = (resultData && resultData.success !== undefined) ? resultData.success : true;
            resolveLastStep(resolvedDetail, result, null, null, null, isSuccess);

            // Show thinking pill while AI processes tool result
            this.addThinkingPillToCurrentTurn();
            this.messagesList.scrollTop = this.messagesList.scrollHeight;
        });




        // Build full AI context
        const context = await contextManager.getFullContext();

        const selectedModelObj = this.availableModels.find(m => m.id === this.currentModel) || this.availableModels[1];

        // Start request
        window.electronAPI.aiStream({
            requestId,
            provider: selectedModelObj.provider,
            prompt: fullPrompt,
            context: context,
            options: {
                model: selectedModelObj.model
            }
        });
    }

    renderFileBadge(fileName, status = '') {
        const iconData = getIconForFile(fileName);

        const badge = document.createElement('div');
        badge.className = 'ai-file-badge';

        const icon = document.createElement('img');
        icon.src = iconData.value;
        icon.className = 'ai-file-icon';

        const name = document.createElement('span');
        name.className = 'ai-file-name';
        name.textContent = fileName;

        badge.appendChild(icon);
        badge.appendChild(name);

        if (status) {
            const statusSpan = document.createElement('span');
            statusSpan.className = 'ai-file-status';
            statusSpan.textContent = status;
            badge.appendChild(statusSpan);
        }

        return badge;
    }

    renderActions(messageDiv, content) {
        if (messageDiv.querySelector('.ai-message-actions')) return;

        // --- NEW: Files Modified Section ---
        if (this.modifiedFilesThisTurn && this.modifiedFilesThisTurn.size > 0) {
            const filesModifiedContainer = document.createElement('div');
            filesModifiedContainer.className = 'ai-files-modified-container';

            const header = document.createElement('div');
            header.className = 'ai-files-modified-header';
            header.innerHTML = `Files modified <span class="ai-files-modified-pill">${this.modifiedFilesThisTurn.size}</span>`;
            filesModifiedContainer.appendChild(header);

            // Container for chips with chevrons
            const chipsWrapper = document.createElement('div');
            chipsWrapper.className = 'ai-files-modified-wrapper';

            const leftBtn = document.createElement('div');
            leftBtn.className = 'ai-mod-chevron left hidden';
            leftBtn.innerHTML = '<i class="codicon codicon-chevron-left"></i>';

            const rightBtn = document.createElement('div');
            rightBtn.className = 'ai-mod-chevron right hidden';
            rightBtn.innerHTML = '<i class="codicon codicon-chevron-right"></i>';

            const chipList = document.createElement('div');
            chipList.className = 'ai-files-modified-chips';

            this.modifiedFilesThisTurn.forEach(filePath => {
                const fileName = filePath.split(/[\\/]/).pop();
                const iconData = getIconForFile(fileName);

                const chip = document.createElement('div');
                chip.className = 'ai-file-mod-chip';
                chip.title = filePath; // Show full path on hover
                chip.onclick = () => {
                    document.dispatchEvent(new CustomEvent('open-file', {
                        detail: { filePath, preview: true }
                    }));
                };

                const icon = document.createElement('img');
                icon.src = iconData.value;
                icon.className = 'ai-file-mod-icon';

                const nameText = document.createElement('span');
                nameText.className = 'ai-file-mod-name';
                nameText.textContent = fileName;

                chip.appendChild(icon);
                chip.appendChild(nameText);
                chipList.appendChild(chip);
            });

            // Scroll Logic
            leftBtn.onclick = () => {
                chipList.scrollBy({ left: -100, behavior: 'smooth' });
            };
            rightBtn.onclick = () => {
                chipList.scrollBy({ left: 100, behavior: 'smooth' });
            };

            const updateChevrons = () => {
                const { scrollLeft, scrollWidth, clientWidth } = chipList;
                leftBtn.classList.toggle('hidden', scrollLeft <= 2);
                rightBtn.classList.toggle('hidden', scrollLeft + clientWidth >= scrollWidth - 2);
            };

            chipList.addEventListener('scroll', updateChevrons);
            // ResizeObserver to handle layout changes
            const ro = new ResizeObserver(() => updateChevrons());
            ro.observe(chipList);

            chipsWrapper.appendChild(leftBtn);
            chipsWrapper.appendChild(chipList);
            chipsWrapper.appendChild(rightBtn);

            filesModifiedContainer.appendChild(chipsWrapper);
            messageDiv.appendChild(filesModifiedContainer);

            // Initial check
            setTimeout(updateChevrons, 100);
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'ai-message-actions';

        const createBtn = (iconSource, onClick, isImage = false) => {
            const btn = document.createElement('button');
            btn.className = 'ai-action-btn';
            if (isImage) {
                btn.innerHTML = `<img src="${iconSource}" style="width: 14px; height: 14px; display: block;">`;
                if (iconSource.includes('bell')) btn.classList.add('ai-bell-btn');
            } else {
                btn.innerHTML = `<i class="${iconSource}"></i>`;
            }
            if (onClick) btn.addEventListener('click', onClick);
            return btn;
        };

        const copyBtn = createBtn('../../assets/modified_icons/copy.svg', () => {
            navigator.clipboard.writeText(content);
            const img = copyBtn.querySelector('img');
            const originalSrc = img.src;
            img.src = '../../assets/modified_icons/check.svg';
            setTimeout(() => img.src = originalSrc, 2000);
        }, true);
        copyBtn.title = 'Copy';
        actionsDiv.appendChild(copyBtn);

        const bellIcon = this.notificationsEnabled ? '../../assets/modified_icons/bell.svg' : '../../assets/modified_icons/bell-off.svg';
        const bellBtn = createBtn(bellIcon, () => this.toggleNotifications(), true);
        bellBtn.title = 'Toggle Notifications';
        actionsDiv.appendChild(bellBtn);

        const retryBtn = createBtn('../../assets/modified_icons/retry.svg', () => {
            // Retry logic: use last user message content if available
            if (this.messages.length > 0) {
                const lastUserMsg = [...this.messages].reverse().find(m => m.role === 'user');
                if (lastUserMsg) {
                    this.inputTextarea.value = lastUserMsg.content;
                    this.sendMessage();
                }
            }
        }, true);
        retryBtn.title = 'Retry';
        actionsDiv.appendChild(retryBtn);

        messageDiv.appendChild(actionsDiv);
        this.attachCopyListeners(messageDiv);
    }

    stopGeneration() {
        if (!this.isProcessing || !this.currentRequestId) return;
        console.log('[AI] Generation stopped by user');

        window.electronAPI.aiAbort(this.currentRequestId);

        // Clean up listeners
        if (typeof this.activeCleanup === 'function') {
            this.activeCleanup();
            this.activeCleanup = null;
        }

        // --- RESTORE UI STATE (Only if thinking) ---

        // If contentDiv (text) or activityTimeline (tools) exists, we considered it "working"
        const hasTextContent = this.currentFullContent && this.currentFullContent.trim().length > 0;
        const hasActivity = this.currentAssistantMessageDiv && this.currentAssistantMessageDiv.querySelector('.ag-activity-timeline');

        if (!hasTextContent && !hasActivity) {
            // 1. Restore text and attachments to input
            if (this.lastSentText !== undefined) {
                this.inputTextarea.value = this.lastSentText;
                this.currentAttachments = this.lastSentAttachments || [];
                this.renderAttachmentPreviews();
                this.autoResizeInput();
            }

            // 2. Remove last TURN (User + Assistant) from UI and messages array
            if (this.messages.length > 0 && this.messages[this.messages.length - 1].role === 'user') {
                this.messages.pop(); // Remove user from history
            }

            // Remove the user message DOM
            const allUserMessages = this.messagesList.querySelectorAll('.user-message');
            if (allUserMessages.length > 0) {
                allUserMessages[allUserMessages.length - 1].remove();
            }

            // Remove current assistant DOM
            if (this.currentAssistantMessageDiv) {
                this.currentAssistantMessageDiv.remove();
                this.currentAssistantMessageDiv = null;
            }

            // If list is now empty, reset view
            if (this.messagesList.children.length === 0) {
                this.emptyState.classList.remove('hidden');
                this.contentArea.classList.add('empty');
                this.messagesList.classList.add('hidden');
            }
        } else {
            console.log('[AI] Preserving partial response in UI.');
            // Add UI actions (Copy buttons, etc.) to the partial message
            if (this.currentAssistantMessageDiv) {
                this.renderActions(this.currentAssistantMessageDiv, this.currentFullContent);
                // Also add to history array so it's not forgotten
                this.messages.push({ role: 'assistant', content: this.currentFullContent });
            }
        }

        this.isProcessing = false;
        this.currentRequestId = null;
        this.removeThinkingPillFromCurrentTurn(); // CALL BEFORE NULLING
        this.currentAssistantMessageDiv = null;   // NULL AFTER REMOVING PILL
        this.updateSendButtonState(false);
        this.inputTextarea.focus();
    }


    updateSendButtonState(isProcessing) {
        if (!this.sendButton) return;

        const iconImg = this.sendButton.querySelector('.send-icon');

        if (isProcessing) {
            this.sendButton.classList.add('stop-btn');
            this.sendButton.disabled = false; // Enabled so we can click stop
            if (iconImg) {
                iconImg.src = '../../assets/modified_icons/stop.svg';
            }
        } else {
            this.sendButton.classList.remove('stop-btn');
            // State depends on input now
            const hasText = this.inputTextarea.value.trim().length > 0;
            this.sendButton.disabled = !hasText;
            if (iconImg) {
                iconImg.src = '../../assets/modified_icons/arrow-up.svg';
            }
        }
    }

    // --- NEW: Message Block Management ---

    ensureAssistantMessage() {
        if (this.currentAssistantMessageDiv) return this.currentAssistantMessageDiv;

        // Create main container
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message assistant-message';

        // Append to list and scroll
        this.messagesList.appendChild(messageDiv);
        this.messagesList.scrollTop = this.messagesList.scrollHeight;

        // Ensure visibility
        this.contentArea.classList.remove('empty');
        this.emptyState.classList.add('hidden');
        this.messagesList.classList.remove('hidden');

        this.currentAssistantMessageDiv = messageDiv;
        return messageDiv;
    }

    addThinkingPillToCurrentTurn() {
        if (!this.currentAssistantMessageDiv) return;
        if (this.currentAssistantMessageDiv.querySelector('.ai-thinking')) return;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'ai-sidebar-thinking-wrapper';
        this.currentAssistantMessageDiv.appendChild(contentDiv);
        this.messagesList.scrollTop = this.messagesList.scrollHeight;

        if (this.thinkingIndicator) {
            this.thinkingIndicator.stop();
        }

        this.thinkingIndicator = initThinkingIndicator(contentDiv);
    }

    removeThinkingPillFromCurrentTurn() {
        if (this.thinkingIndicator) {
            this.thinkingIndicator.stop();
            this.thinkingIndicator = null;
        }
        if (!this.currentAssistantMessageDiv) return;
        const wrapper = this.currentAssistantMessageDiv.querySelector('.ai-sidebar-thinking-wrapper');
        if (wrapper) wrapper.remove();
    }

    renderThoughtBlock(content) {
        if (!this.currentAssistantMessageDiv) return;

        const duration = Math.ceil((Date.now() - (this.currentTurnStartTime || Date.now())) / 1000);

        const thoughtContainer = document.createElement('div');
        thoughtContainer.className = 'ai-thought-container';

        const thoughtToggle = document.createElement('div');
        thoughtToggle.className = 'ai-thought-toggle';
        thoughtToggle.innerHTML = `
            <i class="codicon codicon-chevron-right ai-thought-icon"></i>
            <span class="ai-thought-text">Thought for ${duration}s</span>
        `;

        const thoughtBody = document.createElement('div');
        thoughtBody.className = 'ai-thought-body hidden';
        thoughtBody.textContent = content;

        thoughtToggle.addEventListener('click', () => {
            thoughtToggle.classList.toggle('expanded');
            thoughtBody.classList.toggle('hidden');
            const icon = thoughtToggle.querySelector('.ai-thought-icon');
            if (thoughtBody.classList.contains('hidden')) {
                icon.classList.remove('codicon-chevron-down');
                icon.classList.add('codicon-chevron-right');
            } else {
                icon.classList.remove('codicon-chevron-right');
                icon.classList.add('codicon-chevron-down');
            }
        });

        thoughtContainer.appendChild(thoughtToggle);
        thoughtContainer.appendChild(thoughtBody);

        this.currentAssistantMessageDiv.appendChild(thoughtContainer);
        this.messagesList.scrollTop = this.messagesList.scrollHeight;
    }

    renderFinalContentInAssistantBlock(content, animate = false, onDone = null, duration = 0) {
        console.log('[AiSideBar] Rendering final content:', content);
        if (!this.currentAssistantMessageDiv) this.ensureAssistantMessage();

        const messageDiv = this.currentAssistantMessageDiv;

        this.removeThinkingPillFromCurrentTurn();

        // Check if there's a Thought Block in this final text that needs rendering
        let thoughtContent = null;
        let finalContent = content || ''; // Ensure string
        const thoughtMatch = finalContent.match(/\[\[THOUGHT\]\]([\s\S]*?)\[\[\/THOUGHT\]\]/);

        const hasThought = messageDiv.querySelector('.ai-thought-container');

        if (thoughtMatch) {
            thoughtContent = thoughtMatch[1].trim();
            finalContent = finalContent.replace(thoughtMatch[0], '').trim();

            if (!hasThought) {
                this.renderThoughtBlock(thoughtContent);
            }
        }

        // Fallback for empty responses
        if (!finalContent && !thoughtMatch && !hasThought) {
            finalContent = '*(No response content provided)*';
        }

        // Render Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'ai-message-content';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'ai-message-actions';
        const createBtn = (iconSource, onClick, isImage = false) => {
            const btn = document.createElement('button');
            btn.className = 'ai-action-btn';
            if (isImage) {
                btn.innerHTML = `<img src="${iconSource}" style="width: 14px; height: 14px; display: block;">`;
                if (iconSource.includes('bell')) btn.classList.add('ai-bell-btn');
            } else {
                btn.innerHTML = `<i class="${iconSource}"></i>`;
            }
            if (onClick) btn.addEventListener('click', onClick);
            return btn;
        };
        const copyBtn = createBtn('../../assets/modified_icons/copy.svg', () => {
            navigator.clipboard.writeText(finalContent);
            const img = copyBtn.querySelector('img');
            const originalSrc = img.src;
            img.src = '../../assets/modified_icons/check.svg';
            setTimeout(() => img.src = originalSrc, 2000);
        }, true);
        copyBtn.title = 'Copy';
        actionsDiv.appendChild(copyBtn);

        const bellIcon = this.notificationsEnabled ? '../../assets/modified_icons/bell.svg' : '../../assets/modified_icons/bell-off.svg';
        const bellBtn = createBtn(bellIcon, () => this.toggleNotifications(), true);
        bellBtn.title = 'Toggle Notifications';
        actionsDiv.appendChild(bellBtn);

        const retryBtn = createBtn('../../assets/modified_icons/retry.svg', () => {
            // Retry logic: use last user message content if available
            if (this.messages.length > 0) {
                const lastUserMsg = [...this.messages].reverse().find(m => m.role === 'user');
                if (lastUserMsg) {
                    this.inputTextarea.value = lastUserMsg.content;
                    this.sendMessage();
                }
            }
        }, true);
        retryBtn.title = 'Retry';
        actionsDiv.appendChild(retryBtn);

        if (animate) {
            contentDiv.textContent = '';
            contentDiv.classList.add('ai-markdown-content');
            this.typeText(contentDiv, finalContent, () => {
                contentDiv.innerHTML = this.formatMessage(finalContent);
                this.attachCopyListeners(contentDiv);

                messageDiv.appendChild(contentDiv);
                messageDiv.appendChild(actionsDiv);
                this.messagesList.scrollTop = this.messagesList.scrollHeight;
                if (onDone) onDone();
            });
        } else {
            contentDiv.classList.add('ai-markdown-content');
            contentDiv.innerHTML = this.formatMessage(finalContent);
            this.attachCopyListeners(contentDiv);
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(actionsDiv);
            this.messagesList.scrollTop = this.messagesList.scrollHeight;
            if (onDone) onDone();
        }
    }

    addMessageToUI(role, content, attachments = [], animate = false, onDone = null, duration = 0) {
        // This is now primarily for USER messages
        if (role === 'user') {
            const messageDiv = document.createElement('div');
            messageDiv.className = `ai-message ${role}-message`;

            // Bubble
            const bubble = document.createElement('div');
            bubble.className = 'ai-message-bubble user-bubble';

            // Add attachments if present (66x66 thumbnails)
            if (attachments && attachments.length > 0) {
                const attachmentContainer = document.createElement('div');
                attachmentContainer.className = 'ai-chat-attachment-container';
                attachments.forEach(path => {
                    const img = document.createElement('img');
                    img.src = `file://${path.replace(/\\/g, '/')}`;
                    img.className = 'ai-chat-attachment-img';
                    img.title = path.split(/[\\/]/).pop();
                    img.onclick = () => {
                        document.dispatchEvent(new CustomEvent('open-file', {
                            detail: { filePath: path, preview: true }
                        }));
                    };
                    attachmentContainer.appendChild(img);
                });
                bubble.appendChild(attachmentContainer);
            }

            const textDiv = document.createElement('div');
            textDiv.textContent = content;
            bubble.appendChild(textDiv);

            // Reply/Undo Icon (Curved arrow) - Now INSIDE the bubble
            const replyIcon = document.createElement('img');
            replyIcon.src = '../../assets/modified_icons/return.svg';
            replyIcon.className = 'user-reply-icon-img';
            bubble.appendChild(replyIcon);

            messageDiv.appendChild(bubble);

            this.messagesList.appendChild(messageDiv);
            this.messagesList.scrollTop = this.messagesList.scrollHeight;
            this.messages.push({ role, content, attachments });

            // Ensure visibility
            this.contentArea.classList.remove('empty');
            this.emptyState.classList.add('hidden');
            this.messagesList.classList.remove('hidden');

            if (onDone) onDone();
        }
    }

    attachCopyListeners(container) {
        container.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.closest('.ai-code-block').querySelector('pre').textContent;
                navigator.clipboard.writeText(code);

                const originalIcon = btn.innerHTML;
                btn.innerHTML = '<i class="codicon codicon-check"></i>';
                btn.style.color = '#4ec9b0';
                btn.style.borderColor = '#4ec9b0';

                setTimeout(() => {
                    btn.innerHTML = originalIcon;
                    btn.style.color = '';
                    btn.style.borderColor = '';
                }, 2000);
            });
        });
    }

    // Markdown Parser logic now delegates code blocks to the CodeBlock module

    // Updated Simple Markdown Parser
    formatMessage(text) {
        if (text === null || text === undefined) return '';
        if (typeof text !== 'string') text = String(text);

        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // quotes replacement not strictly necessary for display, skipping to avoid messing up attributes if we were doing mixed HTML

        // 1. Handle COMPLETE code blocks
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return CodeBlock.create(lang, code);
        });

        // 2. Handle INCOMPLETE code block at the end (for streaming)
        html = html.replace(/```(\w*)\n([\s\S]*)$/, (match, lang, code) => {
            return CodeBlock.create(lang, code);
        });

        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
        html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

        // 3. Handle File Badges (Inline)
        // Improved regex to capture paths and common extensions
        const fileRegex = /\b([\w\/.-]+\.(?:js|ts|jsx|tsx|md|json|css|html|py|rs|go|c|cpp|h|java|sh|yml|yaml))\b/g;
        html = html.replace(fileRegex, (match) => {
            // Very simple check to avoid replacing inside existing HTML tags (like src=...)
            const iconData = getIconForFile(match);
            return `
                <span class="ag-file-badge ag-inline-badge" data-path="${match}">
                    <img src="${iconData.value}" class="ag-file-icon">
                    <span class="ag-file-name">${match}</span>
                </span>
            `.trim().replace(/\n\s*/g, ' ');
        });

        html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Collapse 2+ consecutive blank lines into one, then convert \n to <br>
        // This eliminates the "gap before code block" caused by LLM outputting \n\n before ```
        html = html.replace(/\n{3,}/g, '\n\n');    // 3+ newlines → 2
        html = html.replace(/\n\n(<div class="ai-code-block")/g, '\n$1'); // newlines before code block → 1
        html = html.replace(/(<\/div>)\n\n/g, '$1\n');                    // newlines after code block → 1
        html = html.replace(/\n/g, '<br>');

        return html.trim();
    }

    typeText(element, text, onComplete) {
        let index = 0;
        let currentText = '';
        const speed = 10; // ms per chunk
        const charsPerChunk = 2; // Type a few chars at once for performance

        const type = () => {
            if (!this.isProcessing && index < text.length) {
                // If processing stopped (e.g. user cancelled), perform immediate finish
                element.innerHTML = this.formatMessage(text);
                if (onComplete) onComplete();
                return;
            }

            if (index < text.length) {
                const chunk = text.substr(index, charsPerChunk);
                currentText += chunk;
                index += charsPerChunk;

                // Render styled HTML continuously
                element.innerHTML = this.formatMessage(currentText);

                const isAtBottom = (this.messagesList.scrollHeight - this.messagesList.scrollTop - this.messagesList.clientHeight) <= 50;
                if (isAtBottom) {
                    this.messagesList.scrollTop = this.messagesList.scrollHeight;
                }

                // Attach listeners intermittently or handled by bubbles? 
                // We won't attach copy listeners inside the loop to save perf; user can't click firmly anyway while typing.

                setTimeout(type, speed);
            } else {
                // Final Pass
                element.innerHTML = this.formatMessage(text);
                if (onComplete) onComplete();
            }
        };
        type();
    }

    handleToolEvent(event) {
        this.ensureAssistantMessage();

        if (event.type === 'thought-update') {
            this.removeThinkingPillFromCurrentTurn();
            // Don't duplicate thoughts if already rendered
            if (!this.currentAssistantMessageDiv.querySelector('.ai-thought-container')) {
                this.renderThoughtBlock(event.content);
            }
        } else if (event.type === 'tool-start') {
            this.removeThinkingPillFromCurrentTurn();
            this.addToolStartToUI(event);
        } else if (event.type === 'tool-end') {
            this.updateToolEndInUI(event);
        }
    }

    addToolStartToUI(event) {
        if (!this.currentAssistantMessageDiv) return;

        const toolDiv = document.createElement('div');
        this.currentToolDiv = toolDiv;
        this.currentAssistantMessageDiv.appendChild(toolDiv);

        if (event.tool === 'sandbox') {
            // SANDBOX UI - Authentic Mini Terminal
            const cwd = event.cwd || 'x:\\AirGrove';

            toolDiv.className = 'ai-tool-usage ai-sandbox-tool';
            toolDiv.innerHTML = `
<div class="ai-sandbox-header">
<div class="ai-sandbox-header-left">
<i class="codicon codicon-terminal"></i>
<span style="font-weight:600">Terminal</span>
</div>
<div class="ai-sandbox-header-right">
<div class="codicon codicon-loading codicon-modifier-spin"></div>
</div>
</div>
<div class="ai-sandbox-output">
<div><span class="term-ps">PS</span> <span class="term-path">${cwd}</span><span class="term-arrow">&gt;</span> <span class="term-cmd">${event.query}</span></div>
<div style="margin-top:2px"><i class="codicon codicon-loading codicon-modifier-spin"></i></div>
</div>`;
        } else if (event.tool === 'read_file') {
            // READ FILE UI
            const iconData = getIconForFile(event.query);
            // manually create icon HTML string since we are inside template literal
            // or we can append it after. Let's append after to be safe with elements.

            toolDiv.className = 'ai-tool-usage';
            toolDiv.setAttribute('data-tool-type', event.tool);

            // Create structure programmatically to allow appending element
            toolDiv.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'ai-tool-header';

            // Icon
            const icon = this.createIconElement(iconData);
            header.appendChild(icon);

            // Text
            const textSpan = document.createElement('span');
            textSpan.textContent = `Reading: "${event.query}"...`;
            header.appendChild(textSpan);

            // Spinner
            const spinner = document.createElement('div');
            spinner.className = 'codicon codicon-loading codicon-modifier-spin';
            spinner.style.marginLeft = 'auto';
            header.appendChild(spinner);

            toolDiv.appendChild(header);
        } else {
            // SEARCH / DEFAULT UI
            toolDiv.className = 'ai-tool-usage';
            toolDiv.setAttribute('data-tool-type', event.tool);
            toolDiv.innerHTML = `
                <div class="ai-tool-header">
                    <i class="codicon codicon-search"></i>
                    <span>Searching: "${event.query}"...</span>
                    <div class="codicon codicon-loading codicon-modifier-spin" style="margin-left:auto"></div>
                </div>
            `;
        }

        this.messagesList.scrollTop = this.messagesList.scrollHeight;
    }

    updateToolEndInUI(event) {
        if (!this.currentToolDiv) return;

        const toolDiv = this.currentToolDiv;

        if (event.tool === 'sandbox') {
            const headerRight = toolDiv.querySelector('.ai-sandbox-header-right');
            if (headerRight) {
                // Clear spinner, add copy
                headerRight.innerHTML = '';
                const copyBtn = document.createElement('img');
                copyBtn.src = '../../assets/modified_icons/copy.svg';
                copyBtn.className = 'ai-sandbox-copy-img';
                copyBtn.title = 'Copy Output';
                copyBtn.onclick = (e) => {
                    e.stopPropagation();
                    const text = toolDiv.querySelector('.ai-sandbox-output').textContent;
                    navigator.clipboard.writeText(text);
                };
                headerRight.appendChild(copyBtn);
            }

            // Output Body
            const outputDiv = toolDiv.querySelector('.ai-sandbox-output');
            const cwd = event.cwd || 'x:\\AirGrove';

            // Re-render full terminal output with correct colors
            // Use event.result.command preferentially, fallback to event.query
            const cmd = event.result.command || event.query || '';

            outputDiv.innerHTML = `
<div><span class="term-ps">PS</span> <span class="term-path">${cwd}</span><span class="term-arrow">&gt;</span> <span class="term-cmd">${cmd}</span></div>
<div style="color:#cccccc; margin-top: 4px;">${event.result.output || ''}</div>
<div style="margin-top:4px"><span class="term-ps">PS</span> <span class="term-path">${cwd}</span><span class="term-arrow">&gt;</span> <span class="cursor-block">&nbsp;</span></div>`;

            this.currentToolDiv = null;
            return;
        }

        if (event.tool === 'read_file') {
            const header = toolDiv.querySelector('.ai-tool-header');
            if (header) {
                header.innerHTML = '';
                header.classList.add('read-mode'); // Tight packing for read tool elements

                // We use event.result.path if available, fallback to event.query or "unknown"
                const filePath = (event.result && event.result.path) ? event.result.path : (event.query || 'unknown file');
                const fileName = filePath.split(/[\\/]/).pop();

                // 1. Success Icon
                const icon = document.createElement('i');
                icon.className = 'codicon codicon-check';
                icon.style.color = '#a9dc76';
                icon.style.marginRight = '6px'; // Reduced from 8px
                header.appendChild(icon);

                // 2. "Read" Text
                const labelSpan = document.createElement('span');
                labelSpan.textContent = "Read";
                labelSpan.style.marginRight = '6px'; // Reduced from 8px
                header.appendChild(labelSpan);

                // 3. File Icon
                const fileIconData = getIconForFile(filePath);
                const fileIcon = this.createIconElement(fileIconData);
                fileIcon.style.marginRight = '1px'; // Reduced from 3px to 1px (half-ish)
                header.appendChild(fileIcon);

                // 4. Filename
                const nameSpan = document.createElement('span');
                nameSpan.innerHTML = `<strong>${fileName}</strong>`;
                header.appendChild(nameSpan);

                // Add view button or size info
                if (event.result && event.result.size) {
                    const sizeSpan = document.createElement('span');
                    sizeSpan.style.marginLeft = 'auto';
                    sizeSpan.style.fontSize = '11px';
                    sizeSpan.style.color = '#858585';
                    sizeSpan.textContent = `${event.result.size} bytes`;
                    header.appendChild(sizeSpan);
                }
            }
            this.currentToolDiv = null;
            return;
        }

        // --- SEARCH FILES FINISH ---
        const header = toolDiv.querySelector('.ai-tool-header');
        const spinner = header ? header.querySelector('.codicon-loading') : null;
        if (spinner) spinner.remove();

        const results = event.result || [];

        header.innerHTML = '';
        const icon = document.createElement('i');
        icon.className = 'codicon codicon-search';
        header.appendChild(icon);

        const textSpan = document.createElement('span');
        textSpan.innerHTML = `Searched <strong>${event.query || 'files'}</strong>`;
        header.appendChild(textSpan);

        const countSpan = document.createElement('span');
        countSpan.className = 'result-count';
        countSpan.textContent = `${results.length} results`;
        countSpan.style.marginLeft = 'auto';
        header.appendChild(countSpan);

        const content = document.createElement('div');
        content.className = 'ai-tool-content';

        if (results.length > 0) {
            const list = document.createElement('ul');
            list.className = 'ai-tool-file-list';

            results.slice(0, 5).forEach((file, index) => {
                const li = document.createElement('li');
                li.className = 'ai-tool-file-item';

                // Use master icons
                const iconData = getIconForFile(file.path);
                const icon = this.createIconElement(iconData);

                const numberSpan = document.createElement('span');
                numberSpan.style.color = '#858585';
                numberSpan.style.marginRight = '8px';
                numberSpan.textContent = `${index + 1}.`;

                const nameSpan = document.createElement('span');
                nameSpan.className = 'file-name';
                nameSpan.style.color = '#4daafc';
                nameSpan.style.fontWeight = '500';
                nameSpan.textContent = file.path;

                li.appendChild(numberSpan);
                li.appendChild(icon);
                li.appendChild(nameSpan);

                li.addEventListener('click', () => {

                    document.dispatchEvent(new CustomEvent('open-file', {
                        detail: { filePath: file.fullPath }
                    }));
                });

                list.appendChild(li);
            });

            if (results.length > 5) {
                const more = document.createElement('div');
                more.className = 'ai-tool-more';
                more.style.paddingLeft = '24px';
                more.style.color = '#858585';
                more.textContent = `...and ${results.length - 5} more files.`;
                list.appendChild(more);
            }

            content.appendChild(list);
        }

        toolDiv.appendChild(content);
        this.currentToolDiv = null;
    }

    clearHistory() {
        this.messages = [];
        this.messagesList.innerHTML = '';
        this.emptyState.classList.remove('hidden');
        this.messagesList.classList.add('hidden');
        if (this.contentArea) {
            this.contentArea.classList.add('empty');
        }
        window.electronAPI.aiClearHistory();
    }

    autoResizeInput() {
        if (!this.inputTextarea) return;
        this.inputTextarea.style.height = 'auto'; // Reset height to get true scrollHeight
        const newHeight = Math.min(this.inputTextarea.scrollHeight, 200);
        this.inputTextarea.style.height = newHeight + 'px';
    }

    async handleImagePaste(blob) {
        if (!blob) return;
        if (this.currentAttachments.length >= 5) {
            console.warn('[AI] Maximum 5 attachments allowed.');
            return;
        }

        try {
            const buffer = await blob.arrayBuffer();
            const filePath = await window.electronAPI.saveTempImage(buffer);

            if (filePath) {
                this.currentAttachments.push(filePath);
                this.renderAttachmentPreviews();
            }
        } catch (error) {
            console.error('[AI] Failed to handle image paste:', error);
        }
    }

    renderAttachmentPreviews() {
        if (!this.attachmentPreview) return;

        if (this.currentAttachments.length === 0) {
            this.attachmentPreview.classList.add('hidden');
            this.attachmentPreview.innerHTML = '';
            return;
        }

        this.attachmentPreview.innerHTML = '';
        this.currentAttachments.forEach((filePath, index) => {
            const item = document.createElement('div');
            item.className = 'ai-attachment-item';
            item.innerHTML = `
                <img src="file://${filePath.replace(/\\/g, '/')}" />
                <div class="ai-attachment-delete">
                    <i class="codicon codicon-close"></i>
                </div>
            `;

            const deleteBtn = item.querySelector('.ai-attachment-delete');
            deleteBtn.onclick = () => this.removeFromAttachments(index);

            this.attachmentPreview.appendChild(item);
        });

        this.attachmentPreview.classList.remove('hidden');
    }

    removeFromAttachments(index) {
        this.currentAttachments.splice(index, 1);
        this.renderAttachmentPreviews();
    }

    clearAttachments() {
        this.currentAttachments = [];
        if (this.attachmentPreview) {
            this.attachmentPreview.innerHTML = '';
            this.attachmentPreview.classList.add('hidden');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.aiSideBar = new AiSideBar();
    });
} else {
    window.aiSideBar = new AiSideBar();
}
