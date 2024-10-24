// Importing the Redis instance from the helper module
const { redis } = require("../../../../utils/helper/init/InitRedis");

// Importing constants for cache and token symbol mapping
const {
  HISTORICAL_MAX_SIGNED_SLOT_CACHE,
  TOKEN_TO_SYMBOL,
} = require("../../../../utils/constants/info");

// Exporting the default function to handle incoming requests and generate responses
export default async function handler(req, res) {
  // Destructuring the 'token' parameter from the query string
  let { token } = req.query;

  // Converting the token to lowercase if it exists
  if (token) token = token.toLowerCase();

  // Checking if the token is not undefined and if it is not a valid token in TOKEN_TO_SYMBOL
  if (token != undefined && !TOKEN_TO_SYMBOL[token])
    return res
      .status(400) // Setting HTTP status to 400 for bad request
      .json({ status: 400, message: "ERR! Invalid token." }); // Returning an error message

  // Retrieving cached data from Redis using the defined cache key
  const cachedData = await redis.get(HISTORICAL_MAX_SIGNED_SLOT_CACHE);

  // Checking if the cached data exists
  if (cachedData) {
    // If a token is provided, respond with its specific cached data
    if (token)
      return res.status(200).json({
        status: true, // Indicating success
        message: "Slot data found.", // Success message
        data: cachedData[token], // Data specific to the provided token
        asset: token, // Echoing the token back
      });
    else
      // If no token is provided, respond with all cached data
      return res.status(200).json({
        status: true, // Indicating success
        message: "Slot data found.", // Success message
        data: cachedData, // All cached data
        asset: token, // Echoing token (which is undefined in this case)
      });
  } else {
    // If cached data does not exist, respond with a 404 status
    return res.status(404).json({
      status: false, // Indicating failure
      message: "Slot data not found.", // Error message
      data: null, // No data to return
      asset: token, // Echoing the token back
    });
  }
}
