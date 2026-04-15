const BaseTool = require('../BaseTool');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class LensTool extends BaseTool {
    constructor() {
        super();
        this.name = "lens_analyze";
        this.description = "Analyzes images/screenshots using Gemma-3 to extract errors, identify UI elements, or describe content. Use this when the user asks about an image.";
        this.memory = new Map(); // Store results indexed by image path
        this.parameters = {
            type: "object",
            properties: {
                imagePath: { type: "string", description: "Absolute path to the image file." },
                query: { type: "string", description: "What the user wants to know about the image." }
            },
            required: ["imagePath", "query"]
        };
    }

    async execute({ imagePath, query, rootPath }) {
        try {
            // Resolve relative paths if necessary
            const fullPath = path.isAbsolute(imagePath) ? imagePath : path.join(rootPath || "", imagePath);

            if (!fs.existsSync(fullPath)) {
                return { text: `Error: Image file not found at ${fullPath}` };
            }

            // Check Tool Memory for follow-up questions
            if (this.memory.has(fullPath) && (query.toLowerCase().includes("it") || query.toLowerCase().includes("this image"))) {
                const prevData = this.memory.get(fullPath);
                query = `Context from previous analysis: ${prevData}. New Query: ${query}`;
            }

            const nvidiaApiKey = process.env.NVIDIA_API_KEY;
            if (!nvidiaApiKey) {
                return { text: "Error: NVIDIA_API_KEY is not defined in .env" };
            }

            const imageData = fs.readFileSync(fullPath);
            const base64Image = Buffer.from(imageData).toString("base64");
            const mimeType = fullPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

            const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
            const payload = {
                model: "google/gemma-3-27b-it",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: query },
                            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                        ]
                    }
                ],
                max_tokens: 1024,
                temperature: 0.20,
                top_p: 0.70,
                stream: false
            };

            const response = await axios.post(invokeUrl, payload, {
                headers: {
                    "Authorization": `Bearer ${nvidiaApiKey}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });

            const analysisText = response.data.choices[0].message.content;

            // Save to memory
            this.memory.set(fullPath, analysisText);

            return { 
                text: analysisText, 
                data: { path: fullPath, type: 'vision_analysis' } 
            };
        } catch (error) {
            console.error("[LensTool] NVIDIA Error:", error.response?.data || error.message);
            const errorMsg = error.response?.data?.error?.message || error.message;
            return { text: `Failed to analyze image with Llama Vision: ${errorMsg}` };
        }
    }
}

module.exports = LensTool;
