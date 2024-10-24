// Importing Redis instance for accessing cached data from the Redis database.
const { redis } = require("../../../../utils/helper/init/InitRedis");

// Importing constants for Redis cache key and token-to-symbol mapping.
const {
  MINA_MAX_SIGNED_SLOT_CACHE, // Cache key for the max signed slot data
  TOKEN_TO_SYMBOL, // Object mapping tokens to their symbols
} = require("../../../../utils/constants/info");

// Exporting the default async handler function which handles incoming requests and generates responses
export default async function handler(req, res) {
  // Extracting token from the request query parameters
  let { token } = req.query;

  // If the token exists, convert it to lowercase to ensure case-insensitive matching
  if (token) token = token.toLowerCase();

  // Check if the token is provided and if it is not valid (not in the TOKEN_TO_SYMBOL object)
  if (token != undefined && !TOKEN_TO_SYMBOL[token]) {
    // Return a 400 status response with an error message for an invalid token
    return res
      .status(400)
      .json({ status: 400, message: "ERR! Invalid token." });
  }

  // Retrieve the cached data from Redis using the predefined key MINA_MAX_SIGNED_SLOT_CACHE
  const cachedData = await redis.get(MINA_MAX_SIGNED_SLOT_CACHE);

  // If cached data exists, proceed with the response
  if (cachedData) {
    // If the token is provided, return the specific data for that token
    if (token)
      return res.status(200).json({
        status: true, // Success status
        message: "Slot data found.", // Success message
        data: cachedData[token], // Data specific to the token from the cache
        asset: token, // The token requested
      });
    else
      // If no token is provided, return the entire cached data
      return res.status(200).json({
        status: true, // Success status
        message: "Slot data found.", // Success message
        data: cachedData, // All cached data
        asset: token, // No specific token requested
      });
  } else {
    // If no cached data is found, return a 404 status with an error message
    return res.status(404).json({
      status: false, // Failure status
      message: "Slot data not found.", // Error message indicating missing data
      data: null, // No data to return
      asset: token, // The requested token
    });
  }
}