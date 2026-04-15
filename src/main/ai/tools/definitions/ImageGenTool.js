const fs = require('fs');
const path = require('path');
const axios = require('axios');
const BaseTool = require('../BaseTool');

/**
 * Generates high-quality images using the NVIDIA FLUX.1-schnell API.
 * Features: Smart directory resolution and web-ready relative paths.
 */
class ImageGenTool extends BaseTool {
    constructor() {
        super();
        this.name = 'imageGen_tool';
        this.description = 'Generates high-quality images using the NVIDIA API and saves them to the workspace. Supports smart directory nesting and returns web-ready relative paths.';
        this.maxRetries = 2; // Only retry twice
        this.retryDelay = 1000; // 1 second initial delay
        this.parameters = {
            type: "object",
            properties: {
                prompt: { 
                    type: "string", 
                    description: "The detailed text description of the image to generate." 
                },
                image_name: {
                    type: "string",
                    description: "A descriptive filename for the image (e.g., 'hero-kids.png')."
                },
                save_path: {
                    type: "string",
                    description: "The directory inside the project to save the image. Leave EMPTY if the request is casual/chatting (e.g., 'draw a cat'). Use a path like 'assets/images' if generating an asset for a web project."
                },
                width: {
                    type: "integer",
                    description: "Width of the image (default: 1024).",
                    default: 1024
                },
                height: {
                    type: "integer",
                    description: "Height of the image (default: 1024).",
                    default: 1024
                }
            },
            required: ["prompt", "image_name"]
        };
    }

    async execute(args) {
        const { prompt, image_name, save_path: savePath = "", width = 1024, height = 1024, rootPath } = args;

        if (!rootPath) {
            return { text: "Error: Workspace root path is not available.", data: null };
        }

        const apiKey = process.env.NVIDIA_API_KEY;
        if (!apiKey) {
            return { text: "Error: NVIDIA_API_KEY is not configured in the .env file.", data: null };
        }

        // 1. SMART PATH RESOLUTION
        // Resolve the target directory relative to the workspace root
        const targetDir = path.resolve(rootPath, savePath);
        
        // Ensure the directory exists
        try {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
        } catch (err) {
            return { text: `Error: Failed to create directory '${targetDir}': ${err.message}`, data: null };
        }

        // Ensure filename is correct and has extension (default to .png)
        let finalImageName = image_name.toLowerCase();
        const ext = path.extname(finalImageName);
        const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
        
        if (!ext || !allowedExtensions.includes(ext)) {
            finalImageName += '.png';
        }

        const absolutePath = path.join(targetDir, finalImageName);

        const invokeUrl = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

        // ✅ Implement retry logic with exponential backoff
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`[ImageGenTool] Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                console.log(`[ImageGenTool] Generating image for prompt: "${prompt}" as "${finalImageName}" in "${savePath || 'root'}" (attempt ${attempt + 1})`);

                const response = await axios({
                    method: 'post',
                    url: invokeUrl,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    data: {
                        prompt: prompt,
                        width: width,
                        height: height,
                        seed: 0,
                        steps: 4
                    },
                    timeout: 30000 // 30 second timeout
                });

                let base64Data = null;
                if (response.data.artifacts && response.data.artifacts.length > 0) {
                    base64Data = response.data.artifacts[0].base64;
                } else if (response.data.image) {
                    base64Data = response.data.image;
                } else if (response.data.data && response.data.data.length > 0 && response.data.data[0].b64_json) {
                    base64Data = response.data.data[0].b64_json;
                }

                if (!base64Data) {
                    throw new Error('No image data returned from the API');
                }

                // Save the base64 string as a file
                fs.writeFileSync(absolutePath, Buffer.from(base64Data, 'base64'));

                // 2. THE "SMART AGENT" SECRET: Return the Relative Web Path
                // This is what the AI puts in the HTML (e.g., "assets/images/hero.png")
                const relativePath = path.relative(rootPath, absolutePath);
                const webPath = relativePath.replace(/\\/g, '/');

                console.log(`[ImageGenTool] Image saved successfully to: ${absolutePath}`);
                console.log(`[ImageGenTool] Web-ready relative path: ${webPath}`);

                return { 
                    text: `Successfully generated the image and saved it to: ${webPath}`, 
                    data: { 
                        fileName: finalImageName,
                        filePath: absolutePath,
                        webPath: webPath,
                        prompt,
                        width,
                        height
                    } 
                };

            } catch (error) {
                lastError = error;
                console.error(`[ImageGenTool] Attempt ${attempt + 1} failed:`, error.message);
                
                // Don't retry on certain errors
                if (error.response?.status === 401 || error.response?.status === 403) {
                    break; // Authentication errors - no point retrying
                }
                if (error.message.includes('API key')) {
                    break; // Config errors - no point retrying
                }
            }
        }

        // ✅ All retries failed
        const errorMessage = lastError?.response?.data?.message || lastError?.response?.data?.detail 
            ? JSON.stringify(lastError.response.data.detail) 
            : lastError?.message || 'Unknown error';
        console.error(`[ImageGenTool] All ${this.maxRetries + 1} attempts failed. Last error:`, errorMessage);
        
        return { 
            text: `Error generating image after ${this.maxRetries + 1} attempts: ${errorMessage}`,
            data: null 
        };

    }
}

module.exports = ImageGenTool;
