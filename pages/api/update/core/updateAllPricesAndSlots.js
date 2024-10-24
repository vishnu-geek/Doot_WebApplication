const { redis } = require("../../../../utils/helper/init/InitRedis.js"); // Importing Redis for cache storage

// Importing constants related to token caches and other configurations
const {
  TOKEN_TO_CACHE,
  TOKEN_TO_SYMBOL,
  TOKEN_TO_SIGNED_SLOT,
  TOKEN_TO_GRAPH_DATA,
  HISTORICAL_CID_CACHE,
} = require("../../../../utils/constants/info.js");

const getPriceOf = require("../../../../utils/helper/GetPriceOf.js"); // Importing function to get the price of a token
const appendSignatureToSlot = require("../../../../utils/helper/AppendSignatureToSlot.js"); // Importing function to append signatures
const generateGraphData = require("../../../../utils/helper/GenerateGraphData.js"); // Importing function to generate graph data

const axios = require("axios"); // Importing axios for making HTTP requests

// Function to produce an array of historical data for a given token from the historical object
function produceHistoricalArray(token, historicalObj) {
  const tokenHistoricalArray = []; // Array to hold historical data for the token
  const timestamps = Object.keys(historicalObj); // Get all timestamps from the historical object

  for (const timestamp of timestamps) { // Iterate over each timestamp
    const data = historicalObj[timestamp][token]; // Get data for the token at the current timestamp
    if (data) {
      data.timestamp = timestamp; // Add timestamp to the data
      tokenHistoricalArray.push(data); // Push the data to the historical array
    }
  }

  return tokenHistoricalArray; // Return the array of historical data
}

// Function to produce an array with the latest historical data
function produceHistoricalLatestArray(latestObj) {
  const tokenLatestArray = new Array(); // Create a new array
  tokenLatestArray.push(latestObj); // Push the latest object into the array

  return tokenLatestArray; // Return the array containing the latest data
}

// Function to get the price of a token
async function PriceOf(token) {
  return new Promise((resolve) => {
    const results = getPriceOf(token); // Call getPriceOf to get the price results
    resolve(results); // Resolve the promise with the results
  });
}

// Function to fetch and update prices for a list of tokens
async function startFetchAndUpdates(tokens) {
  const cid = await redis.get(HISTORICAL_CID_CACHE); // Retrieve the CID for historical data from Redis
  const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY; // Get the IPFS gateway from environment variables
  const pinnedData = await axios.get(`https://${GATEWAY}/ipfs/${cid}`); // Fetch pinned data from IPFS using the CID
  const ipfs = pinnedData.data; // Store the retrieved IPFS data

  const failed = []; // Array to hold tokens that failed to update

  for (const token of tokens) { // Iterate over each token
    console.log("\n+++++++++++ STARTING JOB +++++++++++");

    try {
      console.log("++ " + token, "\n"); // Log the current token being processed

      const results = await PriceOf(token); // Get the price of the token

      await redis.set(TOKEN_TO_CACHE[token], results[1]); // Cache the token's latest price
      await redis.set(TOKEN_TO_SIGNED_SLOT[token], "NULL"); // Initialize signed slot for the token

      const DEPLOYER_PUBLIC_KEY = process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY; // Get the deployer's public key from environment variables

      // Append the signature to the token's slot
      await appendSignatureToSlot(
        token,
        results[1],
        results[1].signature,
        DEPLOYER_PUBLIC_KEY
      );

      const latest = new Array(); // Create an array to hold the latest price
      latest.push(results[1]); // Push the latest price into the array

      // Check if the price is below 1
      const subone = results[0] < 1 ? true : false;

      // Prepare historical data for the token
      const historical_latest = produceHistoricalLatestArray(
        ipfs.latest.prices[token]
      );
      const historical_historical = produceHistoricalArray(
        token,
        ipfs.historical
      );

      // Generate graph data based on the current and historical prices
      const graphResult = await generateGraphData(
        subone,
        latest,
        historical_latest,
        historical_historical
      );

      // Prepare the graph result cache object
      const graphResultCacheObj = {
        graph_data: graphResult[0], // Graph data
        min_price: graphResult[1], // Minimum price
        max_price: graphResult[2], // Maximum price
        percentage_change: graphResult[3], // Price change percentage
      };

      await redis.set(TOKEN_TO_GRAPH_DATA[token], graphResultCacheObj); // Cache the graph data for the token
    } catch (err) {
      failed.push(token); // Add the token to the failed list if an error occurs
    }
  }
  console.log("+++++++++++ FINISHED JOB +++++++++++\n");
  return failed; // Return the list of failed tokens
}

// Main handler function for processing incoming requests
export default async function handler(req, res) {
  let responseAlreadySent = false; // Flag to prevent multiple responses
  try {
    const authHeader = req.headers.authorization; // Retrieve the authorization header

    // Check if the authorization token matches the expected secret
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json("Unauthorized"); // Return unauthorized response if not matched
    }

    const tokens = Object.keys(TOKEN_TO_SYMBOL); // Get the list of tokens from the constants
    const failed = await startFetchAndUpdates(tokens); // Start fetching and updating prices

    // Send the response if it hasn't been sent yet
    if (!responseAlreadySent) {
      responseAlreadySent = true;
      if (failed.length > 0) {
        return res.status(200).json({
          status: true,
          message: `Updated prices partially.`,
          data: {
            failed: failed, // Return the list of failed tokens
          },
        });
      } else {
        responseAlreadySent = true;
        return res.status(200).json({
          status: true,
          message: `Updated prices successfully.`, // Return success message
        });
      }
    }
  } catch (err) {
    // Handle errors and ensure the response is sent only once
    if (!responseAlreadySent) {
      responseAlreadySent = true;
      return res
        .status(500)
        .json({ status: false, message: "Internal Server Error" }); // Return internal server error
    }
  }
}
