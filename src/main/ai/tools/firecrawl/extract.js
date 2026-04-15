const firecrawl = require("./client");

async function extractData(url) {
  try {
    const result = await firecrawl.extract(url, {
      prompt: "Extract layout, headings, buttons, navbars, sections"
    });

    return result;
  } catch (err) {
    console.error("Extract error:", err);
    return null;
  }
}

module.exports = extractData;
