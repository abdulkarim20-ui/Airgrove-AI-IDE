const NvidiaProvider = require("./providers/NvidiaProvider");
const GroqProvider = require("./providers/GroqProvider");

class AIManager {
    constructor() {
        this.providers = {};
    }

    getProvider(type) {
        if (this.providers[type]) {
            return this.providers[type];
        }

        let provider;
        if (type === "nvidia") {
            const apiKey = process.env.NVIDIA_API_KEY;
            if (!apiKey) throw new Error("NVIDIA_API_KEY is not defined in .env");
            provider = new NvidiaProvider(apiKey);
        } else if (type === "groq") {
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) throw new Error("GROQ_API_KEY is not defined in .env");
            provider = new GroqProvider(apiKey);
        } else {
            throw new Error(`Unknown provider type: ${type}`);
        }

        this.providers[type] = provider;
        return provider;
    }

    async stream(providerType, prompt, options, onChunk, signal, context = null) {
        const provider = this.getProvider(providerType);
        
        // Pass model from options (set by renderer) to the provider
        return await provider.streamChat(prompt, options, onChunk, signal, context);
    }
}

module.exports = new AIManager();
