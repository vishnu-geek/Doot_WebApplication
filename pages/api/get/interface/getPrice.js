// Importing the redis client from the initialization module
const { redis } = require("../../../../utils/helper/init/InitRedis");
// Importing constants that map tokens to cache keys and symbols
const {
  TOKEN_TO_CACHE,
  TOKEN_TO_SYMBOL,
} = require("../../../../utils/constants/info");

// Fetching the API interface key from environment variables for authorization
const KEY = process.env.NEXT_PUBLIC_API_INTERFACE_KEY;

// Default export function to handle incoming requests
export default async function handler(req, res) {
  // Retrieving the authorization header from the request
  const authHeader = req.headers.authorization;
  // Extracting the token from the query parameters
  let { token } = req.query;

  // Checking if the token exists in the query parameters
  if (token) {
    // Converting the token to lowercase for consistency
    token = token.toLowerCase();

    // Validating the token against the predefined symbols
    if (!TOKEN_TO_SYMBOL[token])
      return res
        .status(400)
        .json({ status: 400, message: "ERR! Invalid token." });

    // Authorizing the request by checking if the authHeader matches the expected format
    if ("Bearer " + KEY != authHeader) {
      return res.status(401).json("Unauthorized.");
    }

    // Attempting to retrieve cached data from Redis using the token's cache key
    const cachedData = await redis.get(TOKEN_TO_CACHE[token]);

    // Checking if cached data was found
    if (cachedData) {
      // Responding with the cached price data if found
      return res.status(200).json({
        status: true,
        data: cachedData,
        asset: token,
        message: "Price data found.",
      });
    } else {
      // Responding with a 404 status if no cached data was found
      return res.status(404).json({
        status: false,
        data: null,
        asset: token,
        message: "Price data not found.",
      });
    }
  }

  // Responding with a 400 status if the token query parameter is missing
  return res
    .status(400)
    .json({ status: 400, message: "ERR! Query parameter missing(token)." });
}
