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

AirGrove isn't just an editor; it's a command center equipped with specialized autonomous tools.

### 🌐 Smart Preview Browser (Interactive DevTools)
*   **Full Engine Support**: Tests your websites across all modern browser engines within the IDE.
*   **Interactive Selection**: Click and select any element on your live website.
*   **Selection Support**: Instantly add selected UI parts to your AI chat. One click allows you to say *"Change the color of this button"* or *"Refactor this header."*
*   **The Advantage**: Why switch to Chrome? Keeping the browser inside AirGrove means the AI has direct access to the DOM, allowing for instant, error-free UI modifications.

### 🖼️ AI Image Generation Tool
*   **Asset Creation**: Generate professional UI assets, logos, and background images without leaving your workspace.
*   **Instant Integration**: Generated images are automatically saved and linked in your project.

### 💻 Integrated Shared Terminal
*   **Interactive PTY**: Real-time bidirectional terminal streaming (Shared Interactive Terminals).
*   **Agent Control**: The AI can execute setup scripts, install dependencies, and run test suites autonomously.

### 🔎 Contextual RAG Manager
*   **Codebase Indexing**: Uses vector embeddings to scan and remember every line of code.
*   **Document Intelligence**: Can read and understand PDF, Word (`.docx`), and even raw text documents to gather project requirements.

### 🛠️ Core Functional Tools
| Tool | Functionality |
| :--- | :--- |
| **File Engine** | Reads, writes, and performs complex multi-line edits across your repository. |
| **Search Engine** | Performs deep web research using Tavily for the latest docs and debugging tips. |
| **Firecrawl Scraper** | Extracts clean markdown/json from any website for the AI to "read" documentation. |
| **Path Tool** | Navigates the filesystem to map out complex project structures. |

---

## ⚡ How It Works (Execution Flow)

1.  **User Instruction**: You talk to AirGrove in natural language.
2.  **Autonomous Planning**: The AI creates a "Task Map" with checklists.
3.  **Context Retrieval**: AirGrove pulls relevant code snippets from your project context.
4.  **Tool Orchestration**: The AI uses its Terminal, File, or Browser tools to execute the plan.
5.  **Live Streaming**: You see the AI's thoughts and terminal output in real-time.
6.  **Interactive Refinement**: Use the **Preview Selector** to highlight UI parts and refine them on the fly.

---

## 🏗️ Architecture Overview

```text
AirGrove/
├── src/
│   ├── main/            # Electron process & OS integrations
│   ├── renderer/        # Real-time UI & Monaco Editor
│   ├── core/            # Agent reasoning & Skills system
│   ├── tools/           # Terminal, Browser, & File system bridges
│   └── components/      # UI primitives (Preview, Terminal, Sidebar)
├── planner/             # Task-todo tracking system
├── rag/                 # RAG context & Vector storage
└── assets/              # AI-generated assets & UI tokens
```

---

## 🚀 Getting Started

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
