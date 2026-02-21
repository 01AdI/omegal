// twil.js
const twilio = require("twilio");
require("dotenv").config();

const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;

// Always have fallback STUN servers ready
const FALLBACK_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" }
];

async function getTurnCredentials() {
  // If no Twilio credentials, return STUN only
  if (!accountSid || !authToken) {
    console.log("No Twilio credentials, using STUN only");
    return FALLBACK_SERVERS;
  }

  try {
    console.log("Fetching TURN credentials from Twilio...");
    const client = twilio(accountSid, authToken);
    
    const token = await client.tokens.create({
      ttl: 3600
    });
    
    console.log("✅ TURN credentials fetched successfully");
    
    // Combine Twilio TURN with STUN fallbacks for better connectivity
    return [...token.iceServers, ...FALLBACK_SERVERS];
    
  } catch (error) {
    console.error('❌ Twilio error:', error.message);
    console.log("Using fallback STUN servers only");
    return FALLBACK_SERVERS;
  }
}

module.exports = getTurnCredentials;