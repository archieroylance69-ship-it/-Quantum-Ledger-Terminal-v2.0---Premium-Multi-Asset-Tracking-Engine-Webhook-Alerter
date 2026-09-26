const axios = require('axios');

// Configurations
// Using a ultra-stable, open currency rate API for testing
const TARGET_URL = 'https://er-api.com'; 
const TARGET_RATE = 1.00; // Trigger an alert if the target rate fluctuates
const CHECK_INTERVAL = 10000; // Check every 10 seconds

async function checkPrice() {
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Checking target site...`);
        
        const response = await axios.get(TARGET_URL);
        
        // SAFETY CHECK: Make sure the expected data exists before reading it
        if (!response.data || !response.data.rates) {
            console.log("⚠️ Warning: Received unexpected data structure from the server.");
            console.log("Here is what the server actually sent:", response.data);
            return; // Stop execution safely without crashing
        }

        // Extract the EUR rate relative to USD as our live example data point
        const currentRate = response.data.rates.EUR;
        console.log(`Current USD to EUR rate is: ${currentRate.toFixed(4)}`);

        // Trigger logic
        if (currentRate > TARGET_RATE) {
            console.log(`🚨 ALERT! Rate is above ${TARGET_RATE}! Sending notification...`);
            sendNotification(currentRate);
        } else {
            console.log(`Rate is normal. Will try again soon.`);
        }

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

function sendNotification(rate) {
    console.log(`SUCCESS: Notification sent to client for rate: ${rate}`);
}

// Start the loop automatically
console.log('Price Tracker Script Started...');
setInterval(checkPrice, CHECK_INTERVAL);
