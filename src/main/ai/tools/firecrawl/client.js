const FirecrawlApp = require("@mendable/firecrawl-js").default;

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
});

module.exports = firecrawl;
