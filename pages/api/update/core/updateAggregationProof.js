const generateAggregationProof = require("../../../../utils/helper/GenerateAggregationProof"); // Importing function to generate aggregation proof

const { redis } = require("../../../../utils/helper/init/InitRedis"); // Importing Redis to use as cache storage

// Declaring constants related to token cache and aggregation proof cache
const {
  TOKEN_TO_CACHE,
  TOKEN_TO_AGGREGATION_PROOF_CACHE,
  TOKEN_TO_SYMBOL,
} = require("../../../../utils/constants/info");

// Exporting handler as default for handling incoming requests
export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization; // Retrieving authorization header
    let { token } = req.query; // Accessing token from the request query

    // Checking if the provided authorization token matches the expected secret
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json("Unauthorized"); // If unauthorized, return error
    }

    if (token) {
      token = token.toLowerCase(); // Convert token to lowercase to avoid case-sensitive issues

      // If the token does not exist in the TOKEN_TO_SYMBOL mapping, return an error
      if (!TOKEN_TO_SYMBOL[token])
        return res
          .status(400)
          .json({ status: 400, message: "ERR! Invalid token." });

      // Get the cached aggregation proof for the token and convert it to a JSON string
      const proofCache = JSON.stringify(
        await redis.get(TOKEN_TO_AGGREGATION_PROOF_CACHE[token])
      );

      let isBase = true; // Initialize flag to check if it's a base proof
      if (proofCache != "NULL") isBase = false; // If a proof exists, mark as false (not base)

      // Define the default structure for the last proof (when no previous proof exists)
      let lastProofDefault = JSON.stringify({
        publicInput: [], // Empty public input array
        publicOutput: [], // Empty public output array
        maxProofsVerified: 0, // Maximum number of proofs verified
        proof: "", // Empty proof string
      });

      // Retrieve cached token data from Redis
      const cachedData = await redis.get(TOKEN_TO_CACHE[token]);
      const priceInfo = cachedData.prices_returned; // Extract price information

      console.log(`\nProof creation for ${token} initialized.`);

      // Generate the aggregation proof using the price info and existing proof or default proof
      const aggregationResults = await generateAggregationProof(
        priceInfo,
        isBase ? lastProofDefault : proofCache, // Use base or previous proof based on the flag
        isBase // Pass the flag indicating whether it's the base proof
      );

      // Store the newly generated aggregation proof in Redis
      await redis.set(
        TOKEN_TO_AGGREGATION_PROOF_CACHE[token],
        JSON.stringify(aggregationResults[0])
      );
      console.log("Created successfully.\n");

      // Return a success response with the generated proof and price information
      return res.status(200).json({
        message: "Created Proof Successfully!",
        data: {
          proof: aggregationResults[0], // Aggregation proof data
          selfAggregationResult: cachedData.price, // Cached price data
        },
        status: true,
        token: token, // Return the token as well
      });
    } else {
      // If the token query parameter is missing, return an error
      return res
        .status(400)
        .json({ status: 400, message: "ERR! Query parameter missing(token)." });
    }
  } catch (err) {
    // Catch any errors and log them, then return a failure response
    console.error(`Error in handler: ${err.message}`);
    return res.status(400).json({
      message: `Proof Creation failed. ERR! : ${err.message}`,
      data: {},
      status: false,
      token: token, // Still return the token if available
    });
  }
}
