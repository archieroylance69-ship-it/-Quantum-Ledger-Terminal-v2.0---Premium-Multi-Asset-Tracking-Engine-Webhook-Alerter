const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let settings = {
    urlToWatch: 'https://google.com',
    discordWebhook: '',
    lastStatus: 'Unknown'
};

let statusLogs = [];
function logEvent(msg) { statusLogs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`); }

async function checkSiteHealth() {
    if (!settings.urlToWatch) return;
    try {
        logEvent(`Pinging target infrastructure: ${settings.urlToWatch}`);
        const start = Date.now();
        const res = await axios.get(settings.urlToWatch, { timeout: 5000 });
        const responseTime = Date.now() - start;
        
        settings.lastStatus = `Online (HTTP ${res.status})`;
        logEvent(`🟢 Server online. Response time: ${responseTime}ms`);
    } catch (err) {
        settings.lastStatus = '🔴 OFFLINE';
        logEvent(`🚨 CRITICAL FAILURE: ${err.message}`);
        if (settings.discordWebhook) {
            await axios.post(settings.discordWebhook, {
                content: `⚠️ **PRODUCTION OUTAGE DETECTED!** Target server **${settings.urlToWatch}** is unresponsive! Error: ${err.message}`
            });
        }
    }
}

setInterval(checkSiteHealth, 20000);

app.get('/', (req, res) => {
    res.send(`
    <html>
    <head><title>Site Guard Pro</title><style>body{font-family:sans-serif;max-width:600px;margin:50px auto;background:#f8f9fa;color:#212529;} .card{background:#ffffff;padding:25px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,0.08);} input,button{width:100%;padding:10px;margin-top:5px;border-radius:4px;border:1px solid #ced4da;} button{background:#0d6efd;color:white;cursor:pointer;font-weight:bold;} ul{background:#212529;padding:15px;height:18px0;overflow-y:auto;font-family:monospace;color:#0dcaf0;list-style:none;height:150px;}</style></head>
    <body>
        <div class="card">
            <h2>🛡️ Site Guard Pro Uptime Suite</h2>
            <p>Current Node Health: <strong>${settings.lastStatus}</strong></p>
            <form action="/save" method="POST">
                <label>Website URL to Monitor</label>
                <input type="text" name="urlToWatch" value="${settings.urlToWatch}">
                <label style="margin-top:10px;display:block;">Emergency Notification Webhook</label>
                <input type="text" name="discordWebhook" value="${settings.discordWebhook}">
                <button type="submit" style="margin-top:15px;">Deploy Monitor Configuration</button>
            </form>
        </div>
        <div class="card">
            <h3>Infrastructure Health History:</h3>
            <ul>${statusLogs.map(s=>`<li>\${s}</li>`).join('') || '<li>Initializing heartbeat diagnostics...</li>'}</ul>
        </div>
    </body>
    </html>`);
});

app.post('/save', (req, res) => {
    settings.urlToWatch = req.body.urlToWatch;
    settings.discordWebhook = req.body.discordWebhook;
    logEvent("🔄 System parameters successfully reallocated.");
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Monitoring platform active at http://localhost:${PORT}`));
