// Import Supabase instance for database interactions
const { supabase } = require("../../../../utils/helper/init/InitSupabase");
// Import Redis instance for caching frequently accessed data
const { redis } = require("../../../../utils/helper/init/InitRedis");
// Utility function to increment the API call counter
const incrementCallCounter = require("../../../../utils/helper/IncrementCallCounter.js");

// Import constants for token mappings to cache and symbols
const {
  TOKEN_TO_CACHE, // Maps token to a cache key for Redis
  TOKEN_TO_SYMBOL, // Maps token to a symbol (for validation)
} = require("../../../../utils/constants/info");

// Import uuid module to validate the format of the API key
const uuid = require("uuid");
// Validate function to check if the API key is a valid UUID
const uuidValidate = uuid.validate;

// Export the main handler function to handle incoming requests
export default async function handler(req, res) {
  // Extract the Authorization header from the request
  const authHeader = req.headers.authorization;
  // Extract the token from the query parameters
  let { token } = req.query;

  // Check if a token is provided in the query
  if (token) {
    // Convert the token to lowercase for case-insensitive comparison
    token = token.toLowerCase();

    // Check if the token exists in the TOKEN_TO_SYMBOL map (valid token)
    if (!TOKEN_TO_SYMBOL[token]) {
      // Return a 400 Bad Request if the token is invalid
      return res
        .status(400)
        .json({ status: 400, message: "ERR! Invalid token." });
    }

    // Check if the Authorization header is present
    if (authHeader) {
      // Get the Supabase credentials from environment variables
      const MAIL = process.env.SUPABASE_USER;
      const PASS = process.env.SUPABASE_USER_PASS;

      // Sign in to Supabase using the provided email and password
      await supabase.auth.signInWithPassword({
        email: MAIL,
        password: PASS,
      });

      // Extract the API key from the Authorization header (Bearer [API_KEY])
      const key = authHeader.split(" ")[1];

      // Query the Supabase database to select the generated_key and number of calls
      const { data: select_data, error: select_error } = await supabase
        .from("Auro_Login")
        .select("generated_key, calls")
        .eq("generated_key", key); // Filter by the API key

      // Check if the key is not found or if it is not a valid UUID
      if (select_data.length == 0 || !uuidValidate(key)) {
        // If the key is invalid or not found, sign out and return Unauthorized
        await supabase.auth.signOut();
        return res.status(401).json("Unauthorized.");
      }

      // Retrieve the number of calls from the database entry
      const calls = JSON.parse(select_data[0].calls);
      // Increment the number of API calls using the helper function
      const updatedCalls = JSON.stringify(await incrementCallCounter(calls));

      // Update the number of calls for this API key in the database
      const { data: update_data } = await supabase
        .from("Auro_Login")
        .update({ calls: updatedCalls }) // Update the 'calls' column
        .eq("generated_key", key); // Filter by the API key

      // Sign out from Supabase after completing the update
      await supabase.auth.signOut();

      // Check if the requested token data is available in the Redis cache
      const cachedData = await redis.get(TOKEN_TO_CACHE[token.toLowerCase()]);

      // If data is found in Redis cache, return it with a 200 status (OK)
      if (cachedData) {
        return res.status(200).json({
          status: true,
          data: cachedData, // Cached token data
          asset: token, // The requested token
          message: "Slot data found.", // Success message
        });
      } else {
        // If data is not found in the cache, return a 404 (Not Found) error
        return res.status(404).json({
          status: false,
          data: null, // No data found
          asset: token, // The requested token
          message: "Slot data not found.", // Error message
        });
      }
    } else {
      // Return a 401 Unauthorized error if the Authorization header is missing
      return res
        .status(401)
        .json(
          "ERR! Authentication Failed. Missing header `Authorization:Bearer [API_KEY]'."
        );
    }
  } else {
    // Return a 400 Bad Request error if the token query parameter is missing
    return res
      .status(400)
      .json({ status: 400, message: "ERR! Query parameter missing(token)." });
  }
}
