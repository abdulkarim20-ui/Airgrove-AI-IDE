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

* **Integrated Workflow**: Stop context-switching. Stay inside the IDE for everything from research to asset generation.
* **Autonomous Reasoning**: The agent plans every move before touching your hardware.
* **Context Discovery**: Automatic indexing of your codebase ensures the AI knows your project better than you do.
* **13+ Specialized Tools**: Vision, terminal execution, web scraping, code analysis—all built-in and battle-tested.

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

## 📸 Visual Demonstrations

### Smart Preview with Live Element Selection

AirGrove's embedded browser lets you **click any UI element** and instantly see the corresponding code. Select elements visually, then ask the AI to modify them.

<div align="center">
<img src="assets/demos/smart-preview-selection.png" alt="Smart Preview with Element Selection" width="800" />
<p><em>Click UI elements in the live preview → AI identifies and modifies the code in real-time</em></p>
</div>

---

### Code Editor with Integrated Analysis

Full Monaco editor with code intelligence, AI reasoning panel, and real-time linting.

<div align="center">
<img src="assets/demos/code-editor-analysis.png" alt="Code Editor with Analysis" width="800" />
<p><em>Edit code while the AI panel shows analysis, suggestions, and visual feedback</em></p>
</div>

---

### Live Dashboard Development

Build entire projects without leaving AirGrove. See financial dashboards, luxury websites, and custom UIs rendered in real-time.

<div align="center">
<img src="assets/demos/dashboard-preview.png" alt="Live Dashboard Preview" width="800" />
<p><em>Finance Dashboard developed entirely within AirGrove with live hot-reload</em></p>
</div>

---

### Workspace with Multiple Projects

Manage multiple projects and switch between them seamlessly. Recent workspaces are saved for quick access.

<div align="center">
<img src="assets/demos/workspace-switcher.png" alt="Workspace Switcher" width="800" />
<p><em>Recent workspaces: Mudssr, PlayGround, Finance Dashboard</em></p>
</div>

---

## 🎬 What You Can Do in AirGrove (At a Glance)

| Action | How It Works | Result |
| :--- | :--- | :--- |
| **Click a UI Element** | Click in live preview → element highlighted in code | Instantly select and modify UI parts |
| **Ask AI to Change Something** | *"Make this blue"* or *"Fix the spacing"* | Code updates, preview refreshes instantly |
| **Upload a Screenshot** | Paste error screenshot → AI analyzes it | Identifies bugs and proposes fixes |
| **Ask AI to Build Something** | *"Create a login form"* | Full component generated with styling |
| **Read Documentation** | Paste URL or upload PDF → Firecrawl extracts | AI understands and generates code from docs |
| **Search Your Codebase** | Use grep for patterns and definitions | Find usages, navigate to implementations |
| **Generate Assets** | Describe an image → NVIDIA API creates it | Professional graphics saved to assets/ |
| **Run Terminal Commands** | Ask AI to install/build/deploy | Interactive terminal with real-time output |
| **Analyze Code** | Hover or select code → LSP shows types/definitions | Professional code intelligence |

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
│   │   │   │   ├── DeleteFileTool.js
│   │   │   │   ├── EditFileTool.js
│   │   │   │   ├── GlobTool.js
│   │   │   │   ├── GrepTool.js
│   │   │   │   ├── ImageGenTool.js
│   │   │   │   ├── LensTool.js
│   │   │   │   ├── ListDirectoryTool.js
│   │   │   │   ├── LSPTool.js
│   │   │   │   ├── ReadFileTool.js
│   │   │   │   ├── TerminalRunTool.js
│   │   │   │   ├── WebScraperTool.js
│   │   │   │   ├── WebSearchTool.js
│   │   │   │   └── WriteFileTool.js
│   │   │   └── firecrawl/
│   │   │       ├── client.js
│   │   │       ├── crawl.js
│   │   │       ├── extract.js
│   │   │       └── scrape.js
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

## 💡 Real-World Use Cases

### 🚀 Full-Stack Project Generation
Ask AirGrove to **"Build a React dashboard with authentication, API integration, and dark mode styling."** The AI will:

**What You See**:
- 📝 Code editor showing generated components in real-time
- 🎨 Live preview rendering the dashboard as it's built
- 💬 AI reasoning panel explaining each decision
- ⚡ Terminal showing npm installs and build processes

**What Happens**:
- Scaffold the project structure
- Generate React components with hooks
- Create backend APIs
- Set up authentication
- Apply design system styling
- Install all dependencies
- Start the dev server
- Generate preview screenshots

**Result**: ✅ Production-ready code in minutes.

---

### 🎨 UI/UX Refinement
**"Make this button match Apple's design system."** AirGrove will:

**What You See**:
- 🖱️ Click the button in the live preview to select it
- 🔍 Element highlighted in the code editor (matches blue green indicator)
- 💭 AI analyzes design tokens and suggests modifications
- ✨ Live update shows the refined button styling

**What Happens**:
- Analyze the current button via `lens_analyze`
- Extract design tokens from your system
- Modify styling to match Apple's precision
- Show live preview in the embedded browser
- Allow click-to-refine interactions

**Result**: ✅ Perfect pixel-by-pixel design consistency.

---

### 🔍 Bug Diagnosis from Visual Logs
**Upload a screenshot of an error.** Ask: **"What's wrong with this layout?"**

**What You See**:
- 📸 Screenshot analyzed for visual layout issues
- 🎯 AI identifies spacing, alignment, and color problems
- 🔗 Related code highlighted in the editor
- ✅ Fixed layout rendered in live preview

**What Happens**:
- `lens_analyze` extracts technical details from screenshot
- `web_search` finds similar issues and solutions
- `grep_tool` locates related code
- AI proposes and implements fixes
- Live preview confirms the fix works

**Result**: ✅ Faster debugging with visual context.

---

### 📚 Documentation Integration
**"Read our API docs and create type definitions for all endpoints."**

**What You See**:
- 📖 AirGrove scraping documentation website
- 💾 TypeScript interfaces auto-generated
- ✅ SDK ready to import and use
- 🧪 Integration tests validating the types

**What Happens**:
- `web_scraper` extracts documentation as clean Markdown
- AI parses and understands the API structure
- Generates TypeScript interfaces & client SDKs
- Tests against real endpoints

**Result**: ✅ Type-safe client libraries auto-generated.

---

### ⚡ CI/CD Automation
**"Set up GitHub Actions to test and deploy this project."**

**What You See**:
- 📋 Workflow YAML being generated
- 🔧 GitHub Actions configuration validated
- ▶️ Terminal executing git commands
- 🚀 Deployment pipeline ready

**What Happens**:
- `terminal_run` executes setup commands
- `edit_file` creates workflow YAML files
- `web_search` finds latest best practices
- `grep_tool` discovers test scripts and build commands
- AI configures and validates the pipeline

**Result**: ✅ Fully automated deployment ready to push.

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

## ✨ Featured Workflows

### 1. Visual Element Selection & Modification
- **See It**: Live preview of your website rendered in the embedded browser
- **Click It**: Select any HTML element by clicking on it in the preview
- **Ask It**: Chat with the AI: *"Make this button blue"* or *"Fix the spacing on this card"*
- **Watch It**: Code updates instantly, preview refreshes live
- **Result**: Perfect UI modifications without memorizing selectors

```
┌─────────────────────────┬──────────────────────────┐
│  Code Editor (Monaco)   │   Live Preview Browser   │
│                         │  ┌────────────────────┐  │
│ <button>Click me</button│  │ [Click me] ← Select │  │
│ .button { color: blue } │  │                    │  │
│                         │  └────────────────────┘  │
│  ← AI updates code      │   Preview updates ↑     │
└─────────────────────────┴──────────────────────────┘
```

---

### 2. Autonomous Project Generation
- **Describe It**: *"Build a React dashboard with dark theme and real-time data"*
- **Watch It**: AI creates a task checklist and executes step-by-step
- **Explore It**: File structure, components, styling—all created
- **Refine It**: Point to UI parts → AI adjusts styling/behavior instantly
- **Deploy It**: Terminal runs build, tests, and deployment scripts

---

### 3. Error Diagnosis with Screenshots
- **Upload It**: Paste a screenshot of a bug or layout issue
- **Analyze It**: `lens_analyze` reads the image and describes what's wrong
- **Fix It**: AI finds related code using `grep_tool` and proposes fixes
- **Verify It**: Live preview shows the corrected UI
- **Learn It**: Screenshot-driven debugging with visual context

---

## 🚀 Getting Started

### ⚙️ Prerequisites
- **Node.js** v18+ (for Electron and development)
- **npm** v9+
- **API Keys** for AI providers (see Environment Setup below)

---

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/AirGrove.git
cd AirGrove

# Install dependencies (includes Electron, Monaco, and all tools)
npm install

# Build and Start AirGrove
npm start

# For development with hot reload:
npm run dev
```

---

## 🔐 Environment Setup (Critical)

Create a `.env` file in the project root with the following API keys:

```env
# NVIDIA NIM API (Recommended for performance)
NVIDIA_API_KEY=your_nvidia_api_key_here

# Groq API (Alternative LLM provider)
GROQ_API_KEY=your_groq_api_key_here

# OpenAI (Fallback reasoning)
OPENAI_API_KEY=your_openai_api_key_here

# Web Search
TAVILY_API_KEY=your_tavily_api_key_here

# Documentation Scraping
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

### 🔗 Getting API Keys
- **NVIDIA NIM**: https://build.nvidia.com/
- **Groq**: https://console.groq.com/
- **OpenAI**: https://platform.openai.com/api-keys
- **Tavily**: https://tavily.com/
- **Firecrawl**: https://www.firecrawl.dev/

---

## 🎮 Quick Commands

```bash
# Development mode with live reload
npm run dev

# Build production package
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code (Prettier)
npm run format
```

---

## 📖 Core Concepts

### The Task Map
When you give AirGrove a complex instruction, the AI creates a **Task Map**—a structured plan with checkboxes. You see this plan before execution, allowing you to:
- Approve the overall approach
- Modify specific steps
- Add constraints or preferences

---

### Tool Dispatching
The **ToolManager** at the heart of AirGrove is a dynamic dispatcher. When the AI decides to use a tool, it:
1. Calls `ToolManager.execute(toolName, args)`
2. The tool returns `{ text: string, data: any }`
3. Results are streamed back to the UI in real-time
4. AI processes results and decides the next action

---

### Live Preview Integration
The embedded browser in AirGrove is not passive. It's an interactive UI laboratory:
- **Click any element** to select it
- **See highlighted state** in both browser and code editor
- **Ask AI**: "Make this button blue"
- AI updates the code → browser reflects changes instantly

---

## 🏛️ Project Philosophy

AirGrove is built on three principles:

1. **Autonomy First**: The AI should be able to plan and execute complex workflows without asking permission at every step.
2. **Flow State**: Developers should never context-switch. Everything happens inside one unified environment.
3. **Transparency**: Every decision, tool call, and reasoning step is visible to the user.

---

## 🤝 Contributing

Contributions are welcome! To add a new tool:

1. Create a new file in `src/main/ai/tools/definitions/MyNewTool.js`
2. Extend `BaseTool` and implement `toJSON()` and `execute()`
3. Export your tool class
4. `ToolManager` will auto-discover and register it

Example:

```javascript
const BaseTool = require('../BaseTool');

class MyNewTool extends BaseTool {
    constructor() {
        super();
        this.name = 'my_tool_name';
        this.description = 'What this tool does';
        this.parameters = {
            type: "object",
            properties: {
                arg1: { type: "string", description: "First argument" },
            },
            required: ["arg1"]
        };
    }

    async execute({ arg1 }) {
        // Your implementation here
        return { text: "Result", data: {} };
    }
}

module.exports = MyNewTool;
```

---

## 📊 Performance Metrics

| Metric | Target |
| :--- | :--- |
| **Tool Execution Time** | < 2s average |
| **Code Edit Precision** | 99.9% accuracy (character-perfect matching) |
| **UI Render Time** | < 100ms |
| **Memory Usage** | < 500MB with small projects, < 2GB with large codebases |
| **Codebase Index Speed** | ~10K LOC / second |

---

## 🐛 Troubleshooting

### AI isn't making edits correctly
- Check that `read_file` is being called first to get accurate line numbers
- Verify the search block in `edit_file` includes sufficient context (5 lines before/after)
- Try with fewer edits at once (batch size of 5 or fewer)

### Terminal commands aren't executing
- On Windows, ensure PowerShell syntax (`;` not `&&`, `$env:VAR` not `export VAR`)
- Check that the working directory (`cwd`) exists
- Verify API calls have proper error handling

### Preview browser shows blank page
- Ensure the dev server is running (`npm start` or dev task)
- Check that the port in `portManager.js` matches your server
- Refresh the browser view manually

### Out of memory errors
- Large codebases may need RAG indexing optimization
- Consider excluding node_modules and large asset directories
- Use `list_directory` with limited depth instead of full recursive scans

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author
**Abdulkarim Shaikh**

Building the future of autonomous development environment.

---

<div align="center">

⚡ *"The future of coding is autonomous."*

</div>
