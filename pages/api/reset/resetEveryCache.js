// Import Redis instance and constants
const { redis } = require("../../../utils/helper/init/InitRedis.js");
//variables declared to store cache for token
const {
  TOKEN_TO_CACHE,
  TOKEN_TO_SIGNED_SLOT,
  TOKEN_TO_GRAPH_DATA,
  HISTORICAL_CID_CACHE,
  HISTORICAL_MAX_SIGNED_SLOT_CACHE,
  MINA_CID_CACHE,
  MINA_MAX_SIGNED_SLOT_CACHE,
} = require("../../../utils/constants/info.js");

// Import helper functions for pinning objects and fetching prices
const pinHistoricalObject = require("../../../utils/helper/PinHistorical.js");
const pinMinaObject = require("../../../utils/helper/PinMinaObject.ts");
const getPriceOf = require("../../../utils/helper/GetPriceOf.js");
const appendSignatureToSlot = require("../../../utils/helper/AppendSignatureToSlot.js");

// Function to retrieve token price asynchronously
async function PriceOf(key) {
  return new Promise((resolve) => {
    const results = getPriceOf(key); // Fetch price for the token
    resolve(results); // Resolve the promise with the results
  });
}

// Function to reset token cache (prices and signed slots) for each token
async function resetTokenCache(keys) {
  for (const key of keys) {
    console.log(key); // Log token key for debugging
    const results = await PriceOf(key); // Get the price of the token

    // Set the price and reset signed slot in Redis cache
    await redis.set(TOKEN_TO_CACHE[key], results[1]);
    await redis.set(TOKEN_TO_SIGNED_SLOT[key], "NULL"); // Reset signed slot to "NULL"
  }
}

// Function to reset historical cache by pinning a new historical object
async function resetHistoricalCache(keys) {
  var finalObject = {}; // Object to store the final token data

  for (const key of keys) {
    const CACHED_DATA = await redis.get(TOKEN_TO_CACHE[key]); // Fetch cached token data
    finalObject[key] = CACHED_DATA; // Add token data to the final object
  }

  // Pin the final object to the historical cache and update CID
  const updatedCID = await pinHistoricalObject("NULL", finalObject);
  await redis.set(HISTORICAL_CID_CACHE, updatedCID); // Update the historical CID cache
}

// Function to reset the historical signed slot cache
async function resetHistoricalSignedCache(keys) {
  var finalObj = {}; // Object to store the final token data

  for (const key of keys) {
    finalObj[key] = { community: {} }; // Reset community data for each token
  }

  // Set the new max signed slot cache for historical data
  await redis.set(HISTORICAL_MAX_SIGNED_SLOT_CACHE, finalObj);
}

// Function to reset the Mina blockchain-related cache
async function resetMinaCache(keys) {
  const finalObj = {}; // Object to store the final token data

  for (const key of keys) {
    const CACHED_DATA = await redis.get(TOKEN_TO_CACHE[key]); // Fetch cached token data
    finalObj[key] = CACHED_DATA; // Add token data to the final object
  }

  // Pin the final object to the Mina cache and update CID
  const updatedCID = await pinMinaObject(finalObj, "NULL");
  await redis.set(MINA_CID_CACHE, updatedCID); // Update the Mina CID cache
}

// Function to reset the Mina signed slot cache
async function resetMinaSignedCache(keys) {
  var finalObj = {}; // Object to store the final token data

  for (const key of keys) {
    finalObj[key] = { community: {} }; // Reset community data for each token
  }

  // Set the new max signed slot cache for Mina data
  await redis.set(MINA_MAX_SIGNED_SLOT_CACHE, finalObj);
}

// Function to append signatures to token slots
async function resetSlots(keys) {
  const DEPLOYER_PUBLIC_KEY = process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY; // Get deployer's public key

  for (const key of keys) {
    const CACHED_DATA = await redis.get(TOKEN_TO_CACHE[key]); // Fetch cached token data

    // Append signature to the token slot with the cached data and deployer's public key
    await appendSignatureToSlot(
      key,
      CACHED_DATA,
      CACHED_DATA.signature,
      DEPLOYER_PUBLIC_KEY
    );
  }
}

// Function to reset graph cache for each token
async function resetGraphCache(keys) {
  for (const key of keys) {
    // Reset graph data with default values in Redis cache
    await redis.set(TOKEN_TO_GRAPH_DATA[key], {
      graph_data: [], // Empty graph data
      max_price: 0, // Default max price
      min_price: 0, // Default min price
      percentage_change: "0", // Default percentage change
    });

    console.log("Added graph slot for", key); // Log graph reset for each token
  }
}

// Main handler function that initiates all reset jobs
export default async function handler(req, res) {
  const authHeader = req.headers.authorization; // Get authorization header

  // Check if authorization token matches CRON_SECRET
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json("Unauthorized"); // Return unauthorized response if token doesn't match
    return;
  }

  const keys = Object.keys(TOKEN_TO_CACHE); // Get all token keys
  console.log("\n=============== INIT RESET JOB!! ===============\n");

  // Call reset functions for each cache type
  await resetTokenCache(keys);
  await resetHistoricalCache(keys);
  await resetHistoricalSignedCache(keys);
  await resetMinaCache(keys);
  await resetMinaSignedCache(keys);
  await resetSlots(keys);
  await resetGraphCache(keys);

  // Log completion of the job and return a success response
  console.log("\n=============== FINISHED JOB!! ===============\n");

  return res.status(200).json("Init Cache!"); // Return success message
}
