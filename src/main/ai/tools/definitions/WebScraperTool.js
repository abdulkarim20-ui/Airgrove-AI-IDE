const BaseTool = require('../BaseTool');
const scrapePage = require('../firecrawl/scrape');
const crawlWebsite = require('../firecrawl/crawl');
const extractData = require('../firecrawl/extract');

/**
 * A comprehensive web scraping tool powered by Firecrawl.
 * Supports deep scraping, site crawling, and intelligent UI structure extraction.
 */
class WebScraperTool extends BaseTool {
    constructor() {
        super();
        this.name = 'web_scraper';
        this.description = 
            'Scrape, crawl, or extract structured data from any website to gather deep project context, ' +
            'documentation, or UI structures for cloning and analysis.';
        
        this.parameters = {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The target website URL to process'
                },
                mode: {
                    type: 'string',
                    enum: ['scrape', 'crawl', 'extract'],
                    description: 'Extraction mode: "scrape" for single page markdown, "crawl" for multiple pages, or "extract" for structural UI data.'
                }
            },
            required: ['url', 'mode']
        };
    }

    async execute(args) {
        const { url, mode } = args;
        const apiKey = process.env.FIRECRAWL_API_KEY;

        if (!apiKey) {
            return { 
                text: 'Error: Firecrawl API key is not configured. Please add FIRECRAWL_API_KEY to your .env file.', 
                data: null 
            };
        }

        if (!url) {
            return { text: 'Error: No target URL provided.', data: null };
        }

        try {
            let result;
            let responseText = '';

            if (mode === 'crawl') {
                console.log(`[WebScraperTool] Starting crawl on: ${url}`);
                result = await crawlWebsite(url);
                if (result && result.success) {
                    responseText = `SUCCESSFULLY CRAWLED ${url}.\nPages Discovered: ${result.data?.length || 0}\nSession ID: ${result.id}\nCheck the data for full site map and content.`;
                } else {
                    responseText = `FAILED TO CRAWL ${url}. Check if the site blocks crawlers or the URL is invalid.`;
                }
            } else if (mode === 'extract') {
                console.log(`[WebScraperTool] Starting extraction on: ${url}`);
                result = await extractData(url);
                if (result && result.success) {
                    responseText = `SUCCESSFULLY EXTRACTED UI STRUCTURE FROM ${url}.\nFocus Items: ${JSON.stringify(result.data, null, 2)}`;
                } else {
                    responseText = `FAILED TO EXTRACT UI FROM ${url}. Firecrawl could not parse the structural components.`;
                }
            } else {
                console.log(`[WebScraperTool] Starting scrape on: ${url}`);
                result = await scrapePage(url);
                if (result && result.success) {
                    const mdPreview = result.data?.markdown ? result.data.markdown.slice(0, 1000) + '...' : 'No markdown content available.';
                    responseText = `SUCCESSFULLY SCRAPED ${url} TO MARKDOWN.\n\n--- PREVIEW ---\n${mdPreview}\n\n--- FULL DATA ATTACHED ---`;
                } else {
                    responseText = `FAILED TO SCRAPE ${url}. Reachability or format error.`;
                }
            }

            return {
                text: responseText,
                data: result
            };
        } catch (error) {
            console.error('[WebScraperTool] Error:', error.message);
            return { 
                text: `Error during web scraper execution: ${error.message}`, 
                data: null 
            };
        }
    }
}

module.exports = WebScraperTool;
