const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Configurations
let globalConfig = {
    discordWebhook: '',
    status: 'Operational'
};

// Internal Watchlist Database Cache
let userPortfolio = [
    { token: 'BTC', amountOwned: 0.5, buyTarget: 60000, sellTarget: 100000 },
    { token: 'ETH', amountOwned: 2.0, buyTarget: 2500, sellTarget: 4500 }
];

let logs = [];

function addLog(msg) {
    const timestamp = new Date().toLocaleTimeString();
    logs.unshift("[" + timestamp + "] " + msg);
    if (logs.length > 20) logs.pop();
}

const LIVE_PRICES = {
    BTC: 68500,
    ETH: 3420,
    SOL: 145,
    PEPE: 0.000008
};

// Broader list of known tickers used just for the autocomplete suggestions
// (doesn't need a live price to show up in the dropdown)
const KNOWN_COINS = [
    'BTC', 'ETH', 'SOL', 'PEPE', 'BNB', 'XRP', 'ADA', 'DOGE',
    'AVAX', 'DOT', 'LINK', 'MATIC', 'LTC', 'SHIB', 'TRX', 'UNI'
];

// Background Target Monitor
async function monitorPortfolioTargets() {
    try {
        for (let asset of userPortfolio) {
            const priceFluctuation = (Math.random() - 0.5) * 40;
            const currentMarketPrice = LIVE_PRICES[asset.token] ? (LIVE_PRICES[asset.token] + priceFluctuation) : 100;

            if (currentMarketPrice <= asset.buyTarget) {
                addLog("🎯 BUY TRIGGERED: " + asset.token + " reached floor limit.");
                if (globalConfig.discordWebhook) {
                    await axios.post(globalConfig.discordWebhook, {
                        content: "🟢 **BUY TRIGGER NOTIFICATION**\nAsset **" + asset.token + "** dropped to your target buy price of **$" + asset.buyTarget + "**!"
                    });
                }
            }

            if (currentMarketPrice >= asset.sellTarget) {
                addLog("🔥 TAKE PROFIT TRIGGERED: " + asset.token + " hit target price.");
                if (globalConfig.discordWebhook) {
                    await axios.post(globalConfig.discordWebhook, {
                        content: "🔴 **SELL TRIGGER NOTIFICATION**\nAsset **" + asset.token + "** climbed to your target profit target of **$" + asset.sellTarget + "**!"
                    });
                }
            }
        }
    } catch (e) {
        addLog("❌ Scanning engine logic exception: " + e.message);
    }
}
setInterval(monitorPortfolioTargets, 5000);

// API Data Endpoint
app.get('/api/data', (req, res) => {
    const processedPortfolio = userPortfolio.map(asset => {
        const marketPrice = LIVE_PRICES[asset.token] ? LIVE_PRICES[asset.token] : 100;
        const totalValue = asset.amountOwned * marketPrice;
        return {
            token: asset.token,
            amountOwned: asset.amountOwned,
            buyTarget: asset.buyTarget,
            sellTarget: asset.sellTarget,
            marketPrice: marketPrice.toFixed(2),
            totalValue: totalValue.toFixed(2)
        };
    });
    res.json({
        status: globalConfig.status,
        discordWebhook: globalConfig.discordWebhook,
        portfolio: processedPortfolio,
        logs: logs
    });
});

// Primary UI Delivery Router
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quantum Ledger Terminal v2.0</title>
        <style>
            :root {
                --bg-main: #060913;
                --card-bg: rgba(22, 27, 46, 0.45);
                --card-border: rgba(48, 54, 61, 0.6);
                --neon-cyan: #00f2fe;
                --neon-green: #39ff14;
                --neon-red: #ff3860;
                --text-main: #f0f3f8;
                --text-muted: #8b98a5;
            }
            body {
                font-family: 'Segoe UI', -apple-system, sans-serif;
                background-color: var(--bg-main);
                background-image: radial-gradient(circle at 50% 0%, #101630 0%, #060913 70%);
                color: var(--text-main);
                margin: 0;
                padding: 40px 20px;
                min-height: 100vh;
                box-sizing: border-box;
            }
            .container { max-width: 1000px; margin: 0 auto; }
            header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 20px; background: var(--card-bg); backdrop-filter: blur(12px);
                border: 1px solid var(--card-border); border-radius: 16px; margin-bottom: 25px;
            }
            h1 {
                margin: 0; font-size: 24px; font-weight: 700;
                background: linear-gradient(90deg, #fff, #8ba2ff);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            }
            .status-container { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text-muted); }
            .status-pulse { width: 8px; height: 8px; background-color: var(--neon-green); border-radius: 50%; box-shadow: 0 0 12px var(--neon-green); }
            .dashboard-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 25px; margin-bottom: 25px; }
            .panel { background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--card-border); border-radius: 16px; padding: 25px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); margin-bottom: 25px; }
            h2 { margin-top: 0; margin-bottom: 20px; font-size: 18px; color: var(--neon-cyan); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
            label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
            input { width: 100%; padding: 12px 16px; background: rgba(10, 14, 26, 0.7); border: 1px solid var(--card-border); border-radius: 8px; color: white; font-size: 14px; margin-bottom: 16px; box-sizing: border-box; }
            input:focus { outline: none; border-color: var(--neon-cyan); }
            button { width: 100%; padding: 14px; background: linear-gradient(135deg, #238636 0%, #2ea043 100%); border: none; border-radius: 8px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; }
            .btn-blue { background: linear-gradient(135deg, #1f6feb 0%, #388bfd 100%); }
            .btn-danger { width: auto; padding: 6px 10px; font-size: 12px; background: linear-gradient(135deg, #da3633 0%, #f85149 100%); }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th, td { padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); font-size: 14px; }
            th { color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 700; }
            .token-badge { background: rgba(0, 242, 254, 0.1); color: var(--neon-cyan); padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px; border: 1px solid rgba(0, 242, 254, 0.2); }
            .log-console { background: #04060d; border: 1px solid var(--card-border); border-radius: 12px; padding: 16px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a5d6ff; list-style: none; margin: 0; }
            .log-console li { border-bottom: 1px solid rgba(255,255,255,0.02); padding: 4px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>🐋 Quantum Ledger Terminal <span style="font-size:12px; color:var(--text-muted);">v2.0</span></h1>
                <div class="status-container">
                    <div class="status-pulse"></div>
                    <span id="engine-status">Syncing...</span>
                </div>
            </header>

            <div class="dashboard-grid">
                <div class="panel">
                    <h2>⚙️ Asset Ingestion Rule</h2>
                    <form action="/add-asset" method="POST">
                        <label>Coin Ticker Symbol</label>
                        <input type="text" name="token" placeholder="e.g. BTC" required style="text-transform: uppercase;" list="coin-suggestions" autocomplete="off">
                        <datalist id="coin-suggestions">
                            ${KNOWN_COINS.map(c => `<option value="${c}">`).join('')}
                        </datalist>

                        <label>Inventory Balance Amount</label>
                        <input type="number" step="any" name="amountOwned" placeholder="e.g. 0.5" required>

                        <label>Buy Alert Floor Trigger ($ USD)</label>
                        <input type="number" step="any" name="buyTarget" placeholder="e.g. 60000" required>

                        <label>Sell Profit Cap Trigger ($ USD)</label>
                        <input type="number" step="any" name="sellTarget" placeholder="e.g. 100000" required>

                        <button type="submit">Deploy Strategy Parameters</button>
                    </form>
                </div>

                <div class="panel">
                    <h2>🔗 Output Stream Configuration</h2>
                    <form action="/update-webhook" method="POST" style="margin-bottom: 25px;">
                        <label>Discord Hub Webhook URI</label>
                        <input type="text" name="discordWebhook" id="webhook-input" placeholder="https://discord.com..." value="${globalConfig.discordWebhook}">
                        <button type="submit" class="btn-blue">Commit Pipeline Target</button>
                    </form>

                    <h2>📊 Managed Token Holdings Ledger</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Asset</th>
                                <th>Coins</th>
                                <th>Buy Floor</th>
                                <th>Sell Target</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="portfolio-table-body">
                            <!-- Populated silently by frontend fetch loop -->
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="panel">
                <h2>📈 Live Distributed Network Diagnostics Stream</h2>
                <ul class="log-console" id="log-stream-box">
                    <li>Establishing connection handshake protocols...</li>
                </ul>
            </div>
        </div>

        <script>
            async function deleteAsset(index) {
                await fetch('/delete-asset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ index })
                });
                syncDashboardData();
            }

            async function syncDashboardData() {
                try {
                    const response = await fetch('/api/data');
                    const data = await response.json();
                    document.getElementById('engine-status').innerText = data.status;

                    const tableBody = document.getElementById('portfolio-table-body');
                    if (data.portfolio.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="5">No assets tracked.</td></tr>';
                    } else {
                        tableBody.innerHTML = data.portfolio.map((asset, index) => \`
                            <tr>
                                <td><span class="token-badge">\${asset.token}</span></td>
                                <td>\${asset.amountOwned}</td>
                                <td>$\${asset.buyTarget}</td>
                                <td>$\${asset.sellTarget}</td>
                                <td><button class="btn-danger" onclick="deleteAsset(\${index})">Remove</button></td>
                            </tr>
                        \`).join('');
                    }

                    const logBox = document.getElementById('log-stream-box');
                    if (data.logs.length === 0) {
                        logBox.innerHTML = '<li>Awaiting telemetry ticks...</li>';
                    } else {
                        logBox.innerHTML = data.logs.map(log => \`<li>\${log}</li>\`).join('');
                    }
                } catch (err) {
                    console.error("Telemetry fetch error:", err);
                }
            }

            setInterval(syncDashboardData, 3000);
            window.onload = syncDashboardData;
        </script>
    </body>
    </html>
    `);
});

app.post('/add-asset', (req, res) => {
    const symbol = req.body.token.toUpperCase().trim();
    const amount = parseFloat(req.body.amountOwned) || 0;
    const buyPrice = parseFloat(req.body.buyTarget) || 0;
    const sellPrice = parseFloat(req.body.sellTarget) || 0;
    const exists = userPortfolio.findIndex(a => a.token === symbol);
    if (exists > -1) {
        userPortfolio[exists] = { token: symbol, amountOwned: amount, buyTarget: buyPrice, sellTarget: sellPrice };
        addLog("🔄 Updated metrics inside register matrix: " + symbol);
    } else {
        userPortfolio.push({ token: symbol, amountOwned: amount, buyTarget: buyPrice, sellTarget: sellPrice });
        addLog("➕ Allocated new asset tracking profile: " + symbol);
    }
    res.redirect('/');
});

app.post('/delete-asset', (req, res) => {
    const targetIdx = parseInt(req.body.index);
    if (targetIdx >= 0 && targetIdx < userPortfolio.length) {
        addLog("❌ Deallocated asset node from core: " + userPortfolio[targetIdx].token);
        userPortfolio.splice(targetIdx, 1);
    }
    res.json({ ok: true });
});

app.post('/update-webhook', (req, res) => {
    globalConfig.discordWebhook = (req.body.discordWebhook || '').trim();
    addLog("⚙️ Dynamic network target webhook reallocated.");
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log("Premium Asset Dashboard active at http://localhost:" + PORT);
});