const axios = require("axios");
const fs = require("fs");
const path = require("path");
const categoriesPath = path.join(__dirname, "Cats/goguardian.v1.json");
let ggcats = {};
try {
  ggcats = JSON.parse(fs.readFileSync(categoriesPath, "utf8"));
} catch (e) {
  ggcats = {};
}
async function check(domain) {
  const start = Date.now();
  const HARDCODED_KEY = "ccd522cc-ba45-4554-b0d8-567ebc8c38a3";
  try {
    const d = String(domain)
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    const response = await axios({
      method: 'GET',
      url: `https://panther.goguardian.com/api/v1/ext/fullurl/categories?url=${encodeURIComponent(d)}`,
      headers: {
        'Authorization': HARDCODED_KEY,
        'Accept': '*/*'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    if (response.status !== 200) {
        throw new Error(`API Error: ${response.status}`);
    }
    const obj = response.data || {};
    const cats = obj?.categories?.[0]?.cats || [];
    const categoryId = cats.length ? cats[0] : null;
    const categoryName = (categoryId != null && ggcats[categoryId]) ? ggcats[categoryId] : "Unknown";
    // Without a specific blocked list, we assume allowed unless logic dictates otherwise.
    // Standardizing on allowing unless explicitly blocked.
    const blocked = false; 
    return {
      category: categoryName,
      allow: !blocked,
      ms: Date.now() - start
    };
  } catch (e) {
    return {
      category: 'ERROR --> Contact "roadjs" for support',
            allow: true,
      ms: Date.now() - start
    };
  }
}
module.exports = { check };
