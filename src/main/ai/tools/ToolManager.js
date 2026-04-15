const fs = require("fs");
const path = require("path");

class ToolManager {
    constructor() {
        this.tools = new Map();
        this.registerAllTools();
    }

    /**
     * Scans the 'definitions' folder and registers each tool found.
     */
    registerAllTools() {
        const definitionsDir = path.join(__dirname, "definitions");
        
        // Ensure directory exists
        if (!fs.existsSync(definitionsDir)) {
            console.warn(`[ToolManager] Missing definitions directory: ${definitionsDir}`);
            return;
        }

        const files = fs.readdirSync(definitionsDir);
        for (const file of files) {
            if (file.endsWith(".js")) {
                try {
                    const ToolClass = require(path.join(definitionsDir, file));
                    // Check if ToolClass is a constructor
                    if (typeof ToolClass === "function") {
                        const toolInstance = new ToolClass();
                        this.registerTool(toolInstance);
                    }
                } catch (error) {
                    console.error(`[ToolManager] Failed to load tool from ${file}:`, error);
                }
            }
        }
    }

    /**
     * Register a specific tool instance.
     */
    registerTool(tool) {
        if (!tool.name) {
            console.error("[ToolManager] Cannot register tool without a name property.");
            return;
        }
        this.tools.set(tool.name, tool);
        console.log(`[ToolManager] Registered tool: ${tool.name}`);
    }

    /**
     * Get a tool definition for JSON-based tool-calling models.
     */
    getToolSchemas() {
        return Array.from(this.tools.values()).map(t => t.toJSON());
    }

    /**
     * Executes a tool with the provided arguments.
     * @param {string} name - Name of the tool.
     * @param {Object} args - Arguments to pass to the tool.
     * @returns {Object} result - { text: string, data: any }
     */
    async execute(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            return { text: `Error: Tool '${name}' not found.`, data: null };
        }

        try {
            return await tool.execute(args);
        } catch (error) {
            console.error(`[ToolManager] Execution failed for '${name}':`, error);
            return { text: `Error executing tool '${name}': ${error.message}`, data: null };
        }
    }

    /**
     * List all registered tools and their descriptions.
     */
    listTools() {
        return Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description
        }));
    }
}

// Global Singleton for ease of use
const globalToolManager = new ToolManager();

module.exports = { ToolManager, globalToolManager };
