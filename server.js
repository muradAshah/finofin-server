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
    console.log("->", full);
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

const COMMON = {
  "apple":"AAPL","microsoft":"MSFT","google":"GOOGL","alphabet":"GOOGL",
  "amazon":"AMZN","tesla":"TSLA","nvidia":"NVDA","meta":"META","facebook":"META",
  "netflix":"NFLX","intel":"INTC","amd":"AMD","salesforce":"CRM","adobe":"ADBE",
  "oracle":"ORCL","ibm":"IBM","cisco":"CSCO","qualcomm":"QCOM","paypal":"PYPL",
  "uber":"UBER","airbnb":"ABNB","spotify":"SPOT","shopify":"SHOP","twitter":"X",
  "snap":"SNAP","snapchat":"SNAP","pinterest":"PINS","robinhood":"HOOD",
  "palantir":"PLTR","crowdstrike":"CRWD","datadog":"DDOG","snowflake":"SNOW",
  "arm":"ARM","broadcom":"AVGO","zoom":"ZM","dropbox":"DBX","square":"SQ","block":"SQ",
  "walmart":"WMT","target":"TGT","costco":"COST","home depot":"HD",
  "nike":"NKE","starbucks":"SBUX","mcdonalds":"MCD","mcdonald's":"MCD",
  "gamestop":"GME","game stop":"GME","gamespot":"GME","gme":"GME",
  "amc":"AMC","amc entertainment":"AMC",
  "dollar general":"DG","dollar tree":"DLTR","lowes":"LOW","lowe's":"LOW",
  "best buy":"BBY","etsy":"ETSY","ebay":"EBAY","wayfair":"W",
  "chewy":"CHWY","peloton":"PTON",
  "berkshire":"BRK.B","berkshire hathaway":"BRK.B",
  "jpmorgan":"JPM","jp morgan":"JPM","chase":"JPM",
  "goldman sachs":"GS","goldman":"GS","morgan stanley":"MS",
  "bank of america":"BAC","wells fargo":"WFC","citigroup":"C","citi":"C",
  "visa":"V","mastercard":"MA","american express":"AXP","amex":"AXP",
  "blackrock":"BLK","charles schwab":"SCHW","coinbase":"COIN",
  "exxon":"XOM","chevron":"CVX","shell":"SHEL","bp":"BP",
  "johnson":"JNJ","johnson and johnson":"JNJ","pfizer":"PFE",
  "moderna":"MRNA","abbvie":"ABBV","eli lilly":"LLY","lilly":"LLY",
  "unitedhealth":"UNH","cvs":"CVS","merck":"MRK",
  "att":"T","at&t":"T","verizon":"VZ","disney":"DIS","comcast":"CMCSA",
  "warner":"WBD","warner bros":"WBD","paramount":"PARA",
  "ford":"F","general motors":"GM","gm":"GM","rivian":"RIVN","lucid":"LCID",
  "boeing":"BA","lockheed":"LMT","raytheon":"RTX","caterpillar":"CAT",
  "coca cola":"KO","cocacola":"KO","coke":"KO","pepsi":"PEP","pepsico":"PEP",
  "3m":"MMM","ge":"GE","general electric":"GE","honeywell":"HON",
  "southwest":"LUV","delta":"DAL","united airlines":"UAL","american airlines":"AAL",
  "marriott":"MAR","hilton":"HLT","expedia":"EXPE","booking":"BKNG"
};

app.get("/api/search", async (req, res) => {
  try {
    const q     = (req.query.q || "").trim().toLowerCase();
    const upper = q.toUpperCase();

    if (COMMON[q]) return res.json([{ symbol: COMMON[q], name: q }]);

    const stable = await fmp(`${FMP}/search?query=${encodeURIComponent(q)}&limit=8`);
    if (stable && Array.isArray(stable) && stable.length > 0) return res.json(stable);

    const v3 = await fmp(`${FMP_V3}/search?query=${encodeURIComponent(q)}&limit=8`);
    if (v3 && Array.isArray(v3) && v3.length > 0) return res.json(v3);

    res.json([]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/profile/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/profile?symbol=${req.params.ticker}`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/quote/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/quote?symbol=${req.params.ticker}`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/income/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/income-statement?symbol=${req.params.ticker}&limit=1`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/ratios/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/ratios-ttm?symbol=${req.params.ticker}`);
    if (data && data[0]) console.log("RATIOS FIELDS:", Object.keys(data[0]).join(", "));
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/news/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/news/stock?symbols=${req.params.ticker}&limit=5`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/history/:ticker", async (req, res) => {
  try {
    const stable = await fmp(`${FMP}/historical-prices/daily?symbol=${req.params.ticker}&limit=90`);
    if (stable) return res.json(stable);
    const v3 = await fmp(`${FMP_V3}/historical-price-full/${req.params.ticker}?timeseries=90`);
    res.json(v3 || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/target/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/price-target-consensus?symbol=${req.params.ticker}`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/analyst/:ticker", async (req, res) => {
  try {
    const data = await fmp(`${FMP}/analyst-stock-recommendations?symbol=${req.params.ticker}&limit=1`);
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`\nFinofin server running at http://localhost:${PORT}\n`);
});
