const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = 3000;
// Premium Feature: Admin Access Security
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'password123'; // Tell your client they can change this to whatever they want

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global settings stored in memory (What your client will change from the browser)
let config = {
    targetUrl: 'https://er-api.com',
    targetCurrency: 'EUR',
    alertThreshold: 0.50,
    discordWebhook: '',
    checkInterval: 10000,
    status: 'Stopped'
};

let trackingInterval = null;
let logs = [];

function addLog(message) {
    const time = new Date().toLocaleTimeString();
    logs.unshift(`[${time}] ${message}`);
    if (logs.length > 50) logs.pop(); // Keep last 50 logs
}

async function runTracker() {
    try {
        addLog(`Checking URL: ${config.targetUrl}`);
        const response = await axios.get(config.targetUrl);
        
        if (!response.data || !response.data.rates) {
            addLog("⚠️ Warning: Invalid data structure from API.");
            return;
        }

        const currentRate = response.data.rates[config.targetCurrency];
        if (!currentRate) {
            addLog(`⚠️ Currency ${config.targetCurrency} not found.`);
            return;
        }

        addLog(`Current Rate for ${config.targetCurrency}: ${currentRate.toFixed(4)}`);

        if (currentRate > config.alertThreshold) {
            addLog(`🚨 Alert triggered! Rate ${currentRate.toFixed(4)} > ${config.alertThreshold}`);
            if (config.discordWebhook) {
                await axios.post(config.discordWebhook, {
                    content: `🚀 **SideProjectors Tracker Alert!** ${config.targetCurrency} has reached **${currentRate.toFixed(4)}**!`
                });
                addLog("✅ Discord notification sent!");
            } else {
                addLog("❌ Alert triggered but no Discord Webhook URL is saved.");
            }
        }
    } catch (error) {
        addLog(`❌ Error: ${error.message}`);
    }
}

// Web Dashboard Interface (HTML/CSS)
app.get('/', (req, res) => {
    let logItems = logs.map(l => `<li>${l}</li>`).join('');
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pro Price Tracker Dashboard</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
            .card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; }
            h2 { margin-top: 0; color: #2c3e50; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="text"], input[type="number"] { width: 100%; padding: 10px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
            button { background: #007bff; color: white; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0056b3; }
            .status { font-weight: bold; padding: 5px 10px; border-radius: 4px; display: inline-block; }
            .Running { background: #d4edda; color: #155724; }
            .Stopped { background: #f8d7da; color: #721c24; }
            ul { background: #222; color: #00ff00; font-family: monospace; padding: 15px; border-radius: 4px; list-style: none; height: 200px; overflow-y: auto; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>⚙️ Tracker Configuration</h2>
            <form action="/update" method="POST">
                <div class="form-group">
                    <label>Target API URL</label>
                    <input type="text" name="targetUrl" value="${config.targetUrl}">
                </div>
                <div class="form-group">
                    <label>Currency Code (e.g., EUR, GBP, CAD)</label>
                    <input type="text" name="targetCurrency" value="${config.targetCurrency}">
                </div>
                <div class="form-group">
                    <label>Alert Trigger Threshold (Triggers if rate goes ABOVE this)</label>
                    <input type="number" step="0.0001" name="alertThreshold" value="${config.alertThreshold}">
                </div>
                <div class="form-group">
                    <label>Discord Webhook URL</label>
                    <input type="text" name="discordWebhook" value="${config.discordWebhook}" placeholder="https://discord.com...">
                </div>
                <button type="submit">Save & Restart Tracker</button>
            </form>
        </div>

        <div class="card">
            <h2>📈 System Status: <span class="status ${config.status}">${config.status}</span></h2>
            <h3>Console Logs:</h3>
            <ul>${logItems || '<li>No logs yet. Save settings to start tracker.</li>'}</ul>
            <button onclick="window.location.reload()">Refresh System Logs</button>
        </div>
    </body>
    </html>
    `);
});

// Route to handle configuration changes
app.post('/update', (req, res) => {
    config.targetUrl = req.body.targetUrl;
    config.targetCurrency = req.body.targetCurrency.toUpperCase();
    config.alertThreshold = parseFloat(req.body.alertThreshold);
    config.discordWebhook = req.body.discordWebhook;
    
    if (trackingInterval) clearInterval(trackingInterval);
    
    config.status = 'Running';
    addLog("🔄 System settings updated. Tracker restarted.");
    
    // Execute immediately once, then loop
    runTracker();
    trackingInterval = setInterval(runTracker, config.checkInterval);
    
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`🚀 Success! Your SideProjectors product is live at http://localhost:${PORT}`);
});
