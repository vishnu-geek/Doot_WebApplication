// Script used for storing the aggregation proof of the token
const { supabase } = require("../../../utils/helper/init/InitSupabase.js");
// Supabase is a Firebase alternative used for data storage.

const { redis } = require("../../../utils/helper/init/InitRedis.js");
// Redis is used for caching small amounts of frequently accessed data.

const incrementCallCounter = require("../../../utils/helper/IncrementCallCounter.js");
// A function to increment the call counter for a specific user.

const {
  TOKEN_TO_AGGREGATION_PROOF_CACHE, // Retrieves the token aggregation proof cache.
  TOKEN_TO_SYMBOL, // Converts the token to its symbol (e.g., Ethereum to "ETH").
} = require("../../../utils/constants/info.js");

const uuid = require("uuid");
// A library for generating and validating UUIDs (Universally Unique Identifiers).

const uuidValidate = uuid.validate;
// A function to validate if a string is a valid UUID.

export default async function handler(req, res) {
  // The API route handler function, handling incoming requests (req) and sending responses (res).

  const authHeader = req.headers.authorization;
  // Extracts the 'Authorization' header from the request, which usually contains a token.

  let { token } = req.query;
  // Extracts the 'token' parameter from the query string in the request URL.

  if (token) {
    // Checks if the 'token' is provided in the query string.
    token = token.toLowerCase();
    // Converts the token to lowercase for consistent handling.

    if (!TOKEN_TO_SYMBOL[token])
      // Checks if the token symbol is valid. If not, returns a 400 error (Invalid token).
      return res
        .status(400)
        .json({ status: 400, message: "ERR! Invalid token." });

    if (authHeader) {
      // If an authorization header is present, proceed to authentication.

      const MAIL = process.env.SUPABASE_USER;
      // Email stored in environment variables for authentication.

      const PASS = process.env.SUPABASE_USER_PASS;
      // Password stored in environment variables for authentication.

      await supabase.auth.signInWithPassword({
        // Signs into Supabase using the provided email and password.
        email: MAIL,
        password: PASS,
      });

      const key = authHeader.split(" ")[1];
      // Extracts the token from the 'Authorization' header (Bearer token format).

      const { data: select_data, error: select_error } = await supabase
        // Queries the 'Auro_Login' table to fetch the user's generated_key and number of calls made.
        .from("Auro_Login")
        .select("generated_key, calls")
        .eq("generated_key", key);

      if (select_data.length == 0 || !uuidValidate(key)) {
        // If no data is found or the key is invalid (not a valid UUID), sign out and return a 401 error.
        await supabase.auth.signOut();
        return res.status(401).json("Unauthorized.");
      }

      const calls = JSON.parse(select_data[0].calls);
      // Parses the 'calls' field from the selected data (likely stored as a JSON string).

      const updatedCalls = JSON.stringify(await incrementCallCounter(calls));
      // Increments the call counter for the user and converts it back to a string.

      const { data: update_data } = await supabase
        // Updates the user's call count in the 'Auro_Login' table.
        .from("Auro_Login")
        .update({ calls: updatedCalls })
        .eq("generated_key", key);

      await supabase.auth.signOut();
      // Signs out the user from Supabase after the operations are complete.

      const cachedData = await redis.get(
        TOKEN_TO_AGGREGATION_PROOF_CACHE[token]
      );
      // Retrieves the cached proof data for the token aggregation from Redis.

      if (cachedData) {
        // If proof data is found in the cache, return a 200 response with the data.
        return res.status(200).json({
          status: true,
          message: "Latest proof information found.",
          data: cachedData,
          asset: token,
        });
      } else {
        // If the proof data is not found, return a 404 error (Proof information not found).
        return res.status(404).json({
          status: false,
          message: "Proof information not found.",
          data: {},
          asset: token,
        });
      }
    }
    // If the authorization header is missing or invalid, return a 401 error (Authentication Failed).
    else
      return res
        .status(401)
        .json(
          "ERR! Authentication Failed. Missing header `Authorization:Bearer [API_KEY]'"
        );
  }

  return (
    res
      // If the 'token' query parameter is missing, return a 400 error (Query parameter missing).
      .status(400)
      .json({ status: 400, message: "ERR! Query parameter missing(token)." })
  );
}
