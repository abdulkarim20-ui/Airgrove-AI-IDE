const axios = require("axios");

async function crawlWebsite(url) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  try {
    const response = await axios.post("https://api.firecrawl.dev/v2/crawl", {
      url: url,
      sitemap: "include",
      crawlEntireDomain: false,
      limit: 10,
      scrapeOptions: {
        onlyMainContent: false,
        maxAge: 172800000,
        parsers: ["pdf"],
        formats: ["markdown"]
      }
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return {
        success: true,
        data: response.data.data
    };
  } catch (err) {
    console.error("Crawl error:", err.response?.data || err.message);
    return {
        success: false,
        error: err.response?.data || err.message
    };
  }
}

module.exports = crawlWebsite;
