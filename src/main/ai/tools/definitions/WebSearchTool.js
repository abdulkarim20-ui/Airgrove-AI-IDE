const axios = require('axios');
const BaseTool = require('../BaseTool');

/**
 * Performs a web search using the Tavily API to get relevant information.
 */
class WebSearchTool extends BaseTool {
    constructor() {
        super();
        this.name = 'web_search';
        this.description = 
            'Performs a web search using the Tavily API to get real-time, relevant information from the internet. ' +
            'Use this when you need facts, documentation, or any information not present in the local workspace.';
        this.parameters = {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query to look up on the web'
                }
            },
            required: ['query']
        };
    }

    async execute(args) {
        const { query } = args;
        const apiKey = process.env.TAVILY_API_KEY;

        if (!apiKey) {
            return { 
                text: 'Error: Tavily API key is not configured. Please add TAVILY_API_KEY to your .env file.', 
                data: null 
            };
        }

        if (!query) {
            return { text: 'Error: No search query provided.', data: null };
        }

        try {
            const response = await axios.post('https://api.tavily.com/search', {
                api_key: apiKey,
                query,
                search_depth: 'advanced',
                include_images: false,
                max_results: 5,
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = response.data;

            if (!data.results || data.results.length === 0) {
                return { 
                    text: `No search results found for query: "${query}"`, 
                    data: data 
                };
            }

            const formattedResults = data.results
                .map((res) => `Title: ${res.title}\nURL: ${res.url}\nContent: ${res.content}\n---`)
                .join('\n\n');

            return {
                text: `WEB SEARCH RESULTS FOR "${query}":\n\n${formattedResults}`,
                data: data
            };
        } catch (error) {
            console.error('[WebSearchTool] Error:', error.response?.data || error.message);
            const errorMsg = error.response?.data?.detail || error.message;
            return { 
                text: `Error during web search: ${errorMsg}`, 
                data: error.response?.data || null 
            };
        }
    }
}

module.exports = WebSearchTool;
