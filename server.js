const express = require("express");
const cors    = require("cors");
const fetch   = require("node-fetch");

const app  = express();
const PORT = 3000;

const FMP_KEY = "ENbYRYsPSh508icnUc2h910SbIpfgDGf";
const FMP     = "https://financialmodelingprep.com/stable";
const FMP_V3  = "https://financialmodelingprep.com/api/v3";

app.use(cors());
app.use(express.static("public"));

async function fmp(url) {
  try {
    const sep = url.includes("?") ? "&" : "?";
    const full = `${url}${sep}apikey=${FMP_KEY}`;
    console.log("→", full);
    const res  = await fetch(full);
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    const json = JSON.parse(text);
    if (json && json["Error Message"]) return null;
    return json;
  } catch (e) {
    console.error("fetch error:", e.message);
    return null;
  }
}

// ── SEARCH — tries stable, then v3, then common-name dict ────────────────────
const COMMON = {
  "apple":"AAPL","microsoft":"MSFT","google":"GOOGL","alphabet":"GOOGL",
  "amazon":"AMZN","tesla":"TSLA","nvidia":"NVDA","meta":"META","facebook":"META",
  "walmart":"WMT","netflix":"NFLX","disney":"DIS","coca cola":"KO","cocacola":"KO",
  "berkshire":"BRK.B","jpmorgan":"JPM","jp morgan":"JPM","johnson":"JNJ",
  "visa":"V","mastercard":"MA","exxon":"XOM","chevron":"CVX","pfizer":"PFE",
  "bank of america":"BAC","wells fargo":"WFC","goldman sachs":"GS","goldman":"GS",
  "intel":"INTC","amd":"AMD","salesforce":"CRM","adobe":"ADBE","oracle":"ORCL",
  "ibm":"IBM","cisco":"CSCO","qualcomm":"QCOM","paypal":"PYPL","uber":"UBER",
  "airbnb":"ABNB","spotify":"SPOT","shopify":"SHOP","twitter":"X","boeing":"BA",
  "ford":"F","general motors":"GM","gm":"GM","att":"T","verizon":"VZ",
  "home depot":"HD","target":"TGT","costco":"COST","nike":"NKE","starbucks":"SBUX",
  "mcdonalds":"MCD","mcdonald's":"MCD"
};

app.get("/api/search", async (req, res) => {
  try {
    const q     = (req.query.q || "").trim().toLowerCase();
    const upper = q.toUpperCase();

    // 1. Common name dictionary (instant, always works)
    if (COMMON[q]) return res.json([{ symbol: COMMON[q], name: q }]);

    // 2. Try FMP stable search
    const stable = await fmp(`${FMP}/search?query=${encodeURIComponent(q)}&limit=8`);
    if (stable && Array.isArray(stable) && stable.length > 0) {
      return res.json(stable);
    }

    // 3. Try FMP v3 search as fallback
    const v3 = await fmp(`${FMP_V3}/search?query=${encodeURIComponent(q)}&limit=8`);
    if (v3 && Array.isArray(v3) && v3.length > 0) {
      return res.json(v3);
    }

    res.json([]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PROFILE ───────────────────────────────────────────────────────────────────
app.get("/api/profile/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/profile?symbol=${req.params.ticker}`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── QUOTE ─────────────────────────────────────────────────────────────────────
app.get("/api/quote/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/quote?symbol=${req.params.ticker}`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── INCOME STATEMENT ──────────────────────────────────────────────────────────
app.get("/api/income/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/income-statement?symbol=${req.params.ticker}&limit=1`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RATIOS TTM ────────────────────────────────────────────────────────────────
app.get("/api/ratios/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/ratios-ttm?symbol=${req.params.ticker}`);
    // Log fields so we can see exact field names
    if (data && data[0]) console.log("RATIOS FIELDS:", Object.keys(data[0]).join(", "));
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── NEWS ──────────────────────────────────────────────────────────────────────
app.get("/api/news/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/news/stock?symbols=${req.params.ticker}&limit=5`);
    if (data && data[0]) console.log("NEWS FIELDS:", Object.keys(data[0]).join(", "));
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── HISTORICAL PRICES (chart) — try stable then v3 ───────────────────────────
app.get("/api/history/:ticker", async (req, res) => {
  try {
    // Try stable endpoint first
    const stable = await fmp(`${FMP}/historical-prices/daily?symbol=${req.params.ticker}&limit=90`);
    if (stable) {
      console.log("HISTORY TYPE:", Array.isArray(stable) ? "array" : "object", "keys:", Array.isArray(stable) ? stable.length : Object.keys(stable).join(","));
      return res.json(stable);
    }
    // Fallback to v3
    const v3 = await fmp(`${FMP_V3}/historical-price-full/${req.params.ticker}?timeseries=90`);
    res.json(v3 || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PRICE TARGET ──────────────────────────────────────────────────────────────
app.get("/api/target/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/price-target-consensus?symbol=${req.params.ticker}`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYST RATINGS ───────────────────────────────────────────────────────────
app.get("/api/analyst/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/analyst-stock-recommendations?symbol=${req.params.ticker}&limit=1`);
    if (data && data[0]) console.log("ANALYST FIELDS:", Object.keys(data[0]).join(", "));
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`\n✅ Finofin server running at http://localhost:${PORT}`);
  console.log(`   Open http://localhost:${PORT} in your browser\n`);
});
