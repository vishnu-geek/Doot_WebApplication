// Importing Redis client instance from the specified path.
const { redis } = require("../../../../utils/helper/init/InitRedis");
// Importing constants related to token mapping and symbols.
const {
  TOKEN_TO_GRAPH_DATA,
  TOKEN_TO_SYMBOL,
} = require("../../../../utils/constants/info");

// Getting the API interface key from environment variables.
const KEY = process.env.NEXT_PUBLIC_API_INTERFACE_KEY;

// Defining an asynchronous function as the handler for the API endpoint.
export default async function handler(req, res) {
  // Extracting the authorization header from the request.
  const authHeader = req.headers.authorization;
  // Getting the token query parameter from the request.
  let { token } = req.query;

  // Check if the token is provided in the query parameters.
  if (token) {
    // Convert the token to lowercase for consistency.
    token = token.toLowerCase();

    // Validate the token against the predefined constants.
    if (!TOKEN_TO_SYMBOL[token]) {
      // Return an error response if the token is invalid.
      return res
        .status(400)
        .json({ status: 400, message: "ERR! Invalid token." });
    }

    // Check if the authorization header matches the expected Bearer token format.
    if ("Bearer " + KEY != authHeader) {
      // Return an unauthorized response if the auth header is invalid.
      return res.status(401).json("Unauthorized.");
    }

    // Attempt to get cached data from Redis using the token's corresponding graph data key.
    const cachedData = await redis.get(TOKEN_TO_GRAPH_DATA[token]);

    // Check if cached data exists.
    if (cachedData) {
      // If cached data is found, return a success response with the cached data.
      return res.status(200).json({
        status: true,
        data: cachedData,
        asset: token,
        message: "Graph data found.",
      });
    } else {
      // If no cached data is found, return a not found response.
      return res.status(404).json({
        status: false,
        data: null,
        asset: token,
        message: "Graph data not found.",
      });
    }
  } else {
    // If the token query parameter is missing, return a bad request response.
    return res
      .status(400)
      .json({ status: 400, message: "ERR! Query parameter missing(token)." });
  }
}
