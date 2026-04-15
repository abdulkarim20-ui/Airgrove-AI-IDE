# AirGrove Project Structure

This document outlines the architectural organization of the AirGrove autonomous AI IDE.

## 📁 Root Directory
- `src/` → Primary source code for main and renderer processes.
- `assets/` → Brand identity, icons, and static UI resources.
- `docs/` → Project documentation and technical specifications.
- `dist/` → Compiled/transpiled production bundles.
- `planner/` → The AI Task Planning and Plan Management system.
- `rag/` → Retrieval-Augmented Generation modules for codebase context.

## 📁 `src/` (The Core Engine)
- `main/` → Electron main process files (OS integration, window management).
- `renderer/` → Frontend UI logic (Monaco integration, Workbench layout).
- `core/` → The "Brain" of the IDE (Agent logic, AIManager, Skills).
- `tools/` → Implementations for Terminal, File, Search, and Scrape tools.
- `models/` → Provider interfaces for NVIDIA, OpenAI, and Google Gemini.
- `components/` → Reusable UI components (Sidebar, BottomPanel, TerminalBlock).

## 📁 `assets/`
- `icons/` → SVG and PNG icons for the IDE interface.
- `themes/` → CSS/JSON files defining the workbench aesthetics.

## 🛠️ Key Configuration Files
- `package.json` → Dependency management and lifecycle scripts.
- `.env` → Sensitive API keys and secret configurations.
- `README.md` → The primary landing page for the repository.
- `LICENSE` → MIT legal documentation.

---

*Last Updated: April 2026*
