<div align="center">

# 🚀 AirGrove

### Next-Gen Autonomous AI Coding Environment

<img src="assets/icons/logo.png" width="120" onerror="this.src='https://raw.githubusercontent.com/microsoft/vscode-icons/master/icons/light/folder.svg'"/>

![AI IDE](https://img.shields.io/badge/AI%20IDE-Advanced-blue)
![Agent](https://img.shields.io/badge/Agent-Autonomous-green)
![NVIDIA](https://img.shields.io/badge/NVIDIA-NIM%20Powered-brightgreen)
![License](https://img.shields.io/badge/license-MIT-yellow)

</div>

---

## 🌟 Introduction

**AirGrove** is a **fully autonomous AI-powered IDE** engineered from terminal-level architecture. It doesn't just suggest code—it **thinks, plans, and executes** development workflows from start to finish. 

By integrating high-performance AI reasoning with a robust toolkit, AirGrove eliminates the friction of switching between editors, browsers, and terminals, creating a seamless "Flow State" for developers.

---

## 🧠 What Makes AirGrove Unique?

*   **Integrated Workflow**: Stop context-switching. Stay inside the IDE for everything from research to asset generation.
*   **Autonomous Reasoning**: The agent plans every move before touching your hardware.
*   **Context Discovery**: Automatic indexing of your codebase ensures the AI knows your project better than you do.

---

## 🛠️ The AirGrove Toolset

AirGrove is equipped with **13+ specialized autonomous tools** that enable the AI to reason, plan, and execute complex development workflows without human intervention.

---

### 📂 File Operations Suite

| Tool | Purpose |
| :--- | :--- |
| **read_file** | Read file contents with line number support, offset/limit parameters, and document parsing (PDF, DOCX, PPTX) |
| **write_file** | Create new files or append content to existing files in the workspace |
| **edit_file** | Perform precise, multi-line edits with character-perfect search blocks |
| **delete_file** | Securely delete files (moves to trash by default) |
| **list_directory** | Explore directory structures with Git status integration (modified, untracked, added files) |
| **glob_tool** | Wildcard file search (e.g., `**/*.js`, `src/**/components/*.tsx`) across the entire project |

---

### 🔍 Code Intelligence & Search

| Tool | Capability |
| :--- | :--- |
| **grep_tool** | Lightning-fast content search with Regex support. Find function definitions, variable usages, and code patterns across the entire project. Supports context lines and pagination. |
| **lsp_query** | Language Server Protocol integration for professional code intelligence: `goToDefinition`, `findReferences`, `hover`, `documentSymbol`, `workspaceSymbol` |

---

### 🎨 Creative & Visual Tools

| Tool | Functionality |
| :--- | :--- |
| **imageGen_tool** | Generate high-quality AI images using NVIDIA FLUX.1 API. Creates professional UI assets, logos, backgrounds, and custom graphics. Saves directly to `assets/` with web-ready paths. |
| **lens_analyze** | Vision-powered image analysis using NVIDIA Gemma-3. Extract error details from screenshots, identify UI elements, describe visual content, and troubleshoot from visual logs. |

---

### 🌐 Smart Preview Browser & Network

| Tool | Feature |
| :--- | :--- |
| **Smart Preview (Lens Browser)** | **Full Engine Support**: Tests websites across all modern browsers within the IDE. **Interactive Selection**: Click elements to select them, then modify via AI chat ("Change this button color"). **Direct DOM Access**: Real-time visual feedback with instant, error-free UI modifications. |
| **web_search** | Deep research using Tavily API. Fetches latest docs, debugging tips, best practices, and current solutions from across the web. |
| **web_scraper (Firecrawl)** | Extract clean Markdown/JSON from any website. Perfect for parsing documentation, whitepapers, or technical resources without browser rendering issues. |

---

### 💻 Execution & Automation

| Tool | Capability |
| :--- | :--- |
| **terminal_run** | **Interactive PTY**: Real-time bidirectional terminal streaming. **Agent Control**: Execute setup scripts, install dependencies, run test suites, and manage CI/CD tasks autonomously. Supports PowerShell on Windows. |

---

### 🧠 Contextual Intelligence

| Feature | Description |
| :--- | :--- |
| **RAG Manager** | Uses vector embeddings to index and remember every line of code in your project. |
| **Document Parser** | Reads and understands PDF, Word (.docx), PowerPoint (.pptx), and raw text documents to gather project requirements. |
| **Context Discovery** | Automatic indexing ensures the AI has better project knowledge than you do. |
| **Git Awareness** | Integrated Git status monitoring to focus on recently modified files. |

---

## ⚡ How It Works (Execution Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ User Instruction                                                  │
│ "Build a dark-themed dashboard with real-time data"              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Autonomous Planning Phase                                        │
│ • AI creates a Task Map with checklists                          │
│ • Identifies required: components, APIs, styling                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Context Retrieval (RAG Manager)                                  │
│ • grep_tool: Search for existing dashboard patterns              │
│ • read_file: Load design system tokens from config               │
│ • lsp_query: Find related services and data providers            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Tool Orchestration & Execution                                   │
│ • terminal_run: npm install for dependencies                     │
│ • imageGen_tool: Create dashboard preview graphics               │
│ • edit_file: Modify component files with new features            │
│ • web_search: Research best practices for dark UI patterns       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Live Streaming & Feedback                                        │
│ • Terminal output displayed in real-time                         │
│ • AI thoughts and decisions visible                              │
│ • User can interrupt and refine at any step                      │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Interactive Refinement                                           │
│ • Smart Preview: Visual inspection of the dashboard              │
│ • lens_analyze: Screenshot analysis for layout issues            │
│ • User selects UI parts → AI refines styling/behavior            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Overview

```
AirGrove/
│
├── src/main/
│   ├── index.js                    # Electron main process entry point
│   ├── preload.js                  # IPC bridge for renderer-to-main communication
│   │
│   ├── ai/                         # 🧠 AI Core Engine
│   │   ├── AIManager.js            # Orchestrates AI reasoning and tool calls
│   │   ├── ModelRegistry.js        # Manages LLM provider switching
│   │   ├── context/
│   │   │   └── ContextManager.js   # Manages project context & embeddings
│   │   ├── llm/
│   │   │   ├── GroqSummarizer.js
│   │   │   └── NvidiaSummarizer.js
│   │   ├── memory/
│   │   │   └── MemoryManager.js    # Long-term memory & session state
│   │   ├── parsers/
│   │   │   └── DocumentParser.js   # PDF, DOCX, PPTX support
│   │   ├── providers/
│   │   │   ├── BaseProvider.js
│   │   │   ├── GroqProvider.js     # Groq inference API
│   │   │   └── NvidiaProvider.js   # NVIDIA NIM API
│   │   ├── services/
│   │   │   ├── DiffService.js
│   │   │   ├── EditSessionService.js
│   │   │   ├── FileStateService.js
│   │   │   └── LSPService.js       # Language Server Protocol integration
│   │   ├── system/
│   │   │   ├── system_prompt.md    # AI personality & protocols
│   │   │   ├── skills.md           # Design system guidelines
│   │   │   └── SystemManager.js
│   │   ├── tools/
│   │   │   ├── ToolManager.js      # Central tool dispatcher
│   │   │   ├── BaseTool.js         # Abstract base for all tools
│   │   │   ├── definitions/        # 13+ tool implementations
│   │   │   │   ├── read_file.js
│   │   │   │   ├── write_file.js
│   │   │   │   ├── edit_file.js
│   │   │   │   ├── delete_file.js
│   │   │   │   ├── list_directory.js
│   │   │   │   ├── glob_tool.js
│   │   │   │   ├── grep_tool.js
│   │   │   │   ├── lsp_query.js
│   │   │   │   ├── imageGen_tool.js
│   │   │   │   ├── lens_analyze.js
│   │   │   │   ├── terminal_run.js
│   │   │   │   ├── web_search.js
│   │   │   │   └── web_scraper.js
│   │   │   └── firecrawl/
│   │   │       └── Firecrawl SDK wrappers
│   │
│   ├── ipcHandlers/
│   │   ├── editReviewHandlers.js
│   │   └── runHandlers.js
│   │
│   ├── search/
│   │   ├── fileWalker.js
│   │   ├── searchEngine.js
│   │   └── replaceEngine.js
│   │
│   └── services/
│       ├── GitService.js           # Git integration
│       ├── RunService.js           # Execution & scripting
│       ├── TerminalService.js      # Terminal session management
│       └── liveServer/             # Hot reload dev server
│           ├── server.js
│           ├── browser.js
│           ├── fileWatcher.js
│           └── portManager.js
│
├── src/renderer/
│   ├── index.html                  # Main UI shell
│   ├── index.js                    # Renderer process entry point
│   │
│   ├── core/                       # 🎨 UI Core & State Management
│   │   ├── ContextManager.js
│   │   ├── ServiceRegistry.js
│   │   ├── WorkspaceManager.js
│   │   ├── KeyboardManager.js      # Keyboard shortcuts & bindings
│   │   ├── Keybindings.js
│   │   └── TooltipManager.js
│   │
│   ├── components/                 # 🧩 UI Components
│   │   ├── ActivityBar/            # Side navigation
│   │   ├── EditorGroup/            # Monaco editor + tabs
│   │   │   ├── monaco-setup.js
│   │   │   ├── TabsBar/
│   │   │   ├── Breadcrumbs/
│   │   │   └── ImageView/
│   │   ├── MenuBar/                # Top menu
│   │   ├── Panel/                  # Bottom panels (Terminal, Problems, etc.)
│   │   ├── QuickPick/              # Command palette
│   │   ├── SideBar/                # Explorer, Search, AI Assistant
│   │   ├── StatusBar/              # Bottom status bar
│   │   ├── TitleBar/               # Window title & controls
│   │   └── ai/
│   │       └── ThinkingIndicator/  # AI reasoning visualization
│   │
│   ├── editor/
│   │   ├── MonacoSearchBridge.js
│   │   └── InlineEditReviewController.js
│   │
│   ├── search/
│   │   ├── SearchController.js
│   │   ├── SearchModel.js
│   │   └── SearchRenderer.js
│   │
│   └── styles/
│       ├── main.css                # Global styles
│       ├── inline-edit-review.css
│       └── tooltip.css
│
├── assets/                         # 🎨 Static Resources
│   ├── fonts/
│   ├── icons/
│   ├── sounds/
│   └── themes/
│
└── docs/
    └── TERMINAL_WORKSPACE_INTEGRATION.md
```

---

## 🔄 Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Electron + Monaco Editor + Custom React Components |
| **AI/LLM** | NVIDIA NIM API, Groq API, NVIDIA Gemma-3 (Vision) |
| **Backend** | Node.js + Express |
| **Search & Context** | Vector embeddings (RAG), LSP for code intelligence |
| **Terminal** | PTY.js for interactive terminal streams |
| **Code Analysis** | Language Server Protocol (LSP) |
| **Web Tools** | Tavily (search), Firecrawl (scraping) |
| **Styling** | Apple Design System inspired CSS |

---

## � Real-World Use Cases

### 🚀 Full-Stack Project Generation
Ask AirGrove to "Build a React dashboard with authentication, API integration, and dark mode styling." The AI will:
- Scaffold the project structure
- Generate React components with hooks
- Create backend APIs
- Set up authentication
- Apply design system styling
- Install all dependencies
- Start the dev server
- Generate preview screenshots

**Result**: Production-ready code in minutes.

---

### 🎨 UI/UX Refinement
"Make this button match Apple's design system." AirGrove will:
- Analyze the current button via `lens_analyze`
- Extract design tokens from your system
- Modify styling to match Apple's precision
- Show live preview in the embedded browser
- Allow click-to-refine interactions

**Result**: Perfect pixel-by-pixel design consistency.

---

### 🔍 Bug Diagnosis from Visual Logs
Upload a screenshot of an error. Ask: "What's wrong with this layout?"
- `lens_analyze` extracts technical details
- `web_search` finds similar issues and solutions
- `grep_tool` locates related code
- AI proposes and implements fixes
- Live preview confirms the fix works

**Result**: Faster debugging with visual context.

---

### 📚 Documentation Integration
"Read our API docs and create type definitions for all endpoints."
- `web_scraper` extracts documentation as clean Markdown
- AI parses and understands the API structure
- Generates TypeScript interfaces & client SDKs
- Tests against real endpoints

**Result**: Type-safe client libraries auto-generated.

---

### ⚡ CI/CD Automation
"Set up GitHub Actions to test and deploy this project."
- `terminal_run` executes setup commands
- `edit_file` creates workflow YAML files
- `web_search` finds latest best practices
- `grep_tool` discovers test scripts and build commands
- AI configures and validates the pipeline

**Result**: Fully automated deployment ready to push.

---

## 🎯 Key Competitive Advantages

| Feature | Benefit |
| :--- | :--- |
| **13+ Specialized Tools** | No plugin ecosystem needed. Every tool is battle-tested and integrated. |
| **Vision-Enabled** | AI can *see* your UI and fix it visually, not just by code. |
| **Terminal as a First-Class Citizen** | Real interactive PTY means AI can handle complex shell workflows. |
| **Document Intelligence** | AI reads PDFs, Word docs, and specs—not just code. |
| **RAG + LSP** | Combines vector embeddings with Language Server Protocol for context aware code edits. |
| **Live Preview** | Click UI elements, chat about them—AI updates code in real-time. |
| **Zero Context Switching** | Research → Code → Test → Deploy, all in one window. |
| **Autonomous Planning** | AI creates task checklists before executing anything. |
| **Streaming Reasoning** | See AI thoughts in real-time as it solves problems. |
| **Design System Native** | Apple Design System baked in; extensible to your brand. |

---

## �🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/AirGrove.git

# Install dependencies
npm install

# Build and Start
npm start
```

---

## 🔐 Environment Setup

Ensure your `.env` contains:
*   `NVIDIA_API_KEY` (Premium inference)
*   `OPENAI_API_KEY` (Standard reasoning)
*   `TAVILY_API_KEY` (Web search)
*   `FIRECRAWL_API_KEY` (Documentation scraping)

---

## 👨‍💻 Author
**Abdulkarim Shaikh**
Building the future of autonomous development environment.

---

<div align="center">

⚡ *"The future of coding is autonomous."*

</div>
