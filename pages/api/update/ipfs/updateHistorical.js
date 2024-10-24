const { redis } = require("../../../../utils/helper/init/InitRedis.js"); // Importing Redis for cache storage

// Importing constants related to historical data caches
const {
  HISTORICAL_MAX_SIGNED_SLOT_CACHE,
  HISTORICAL_CID_CACHE,
} = require("../../../../utils/constants/info.js");

const pinHistoricalObject = require("../../../../utils/helper/PinHistorical.js"); // Importing function to pin historical data to IPFS

// Main handler function for processing incoming requests
export default async function handler(req, res) {
  const authHeader = req.headers.authorization; // Retrieve the authorization header
  // Check if the authorization token matches the expected secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json("Unauthorized"); // Return unauthorized response if not matched
  }

  const obj = {}; // Object to hold historical data
  const finalSlotState = {}; // Object to hold the final state of the slot

  // Retrieve cached data from Redis
  const CACHED_DATA = await redis.get(HISTORICAL_MAX_SIGNED_SLOT_CACHE);
  const keys = Object.keys(CACHED_DATA); // Get all keys from the cached data

  // Iterate over each key in the cached data
  for (const key of keys) {
    const data = CACHED_DATA[key]; // Get the data for the current key
    obj[key] = data; // Store the data in the obj
    finalSlotState[key] = { community: {} }; // Initialize the final state for the key
  }

  // Retrieve the current CID from Redis
  const cid = await redis.get(HISTORICAL_CID_CACHE);
  // Pin the historical object to IPFS and get the updated CID
  const updatedCID = await pinHistoricalObject(cid, obj);

  // Update the IPFS CID in Redis
  await redis.set(HISTORICAL_CID_CACHE, updatedCID);
  // Reset the max signed slot cache after the historical data has been updated
  await redis.set(HISTORICAL_MAX_SIGNED_SLOT_CACHE, finalSlotState);

  // Return a success response with the updated CID
  return res.status(200).json({
    status: true,
    message: "Updated historical data successfully.",
    data: {
      cid: updatedCID, // Include the updated CID in the response
    },
  });
}
