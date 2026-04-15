const axios = require("axios");

async function scrapePage(url) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  try {
    const response = await axios.post("https://api.firecrawl.dev/v2/scrape", {
      url: url,
      onlyMainContent: false,
      maxAge: 172800000,
      parsers: ["pdf"],
      formats: ["markdown"]
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
    console.error("Scrape error:", err.response?.data || err.message);
    return {
        success: false,
        error: err.response?.data || err.message
    };
  }
}

module.exports = scrapePage;
