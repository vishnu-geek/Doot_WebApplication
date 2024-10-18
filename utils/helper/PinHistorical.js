const axios = require("axios"); // Axios is a JavaScript library used to make HTTP requests
const JWT = process.env.PINATA_JWT; // Fetching the JWT (JSON Web Token) for Pinata API from environment variables
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY; // Fetching the Pinata gateway URL from environment variables

const unpin = require("./Unpin"); // Importing a function to unpin an object from Pinata

// Function to remove old timestamps from the 'historical' object that are older than 24 hours
function removeOldTimestamps(obj) {
  const currentTime = new Date(); // Current timestamp
  const oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds

  // Loop through each timestamp key in the 'historical' object
  Object.keys(obj.historical).forEach((key) => {
    let timestamp = new Date(Number(key)); // Convert the key to a Date object
    let diff = currentTime - timestamp; // Calculate the difference between the current time and the timestamp

    // If the difference is more than one day, remove the entry
    if (diff > oneDay) {
      delete obj.historical[key];
    }
  });
}

// Function to pin the historical object to Pinata
// It takes the previous CID (Content Identifier) and the latest prices
async function pinHistoricalObject(previousCID, latestPrices) {
  let isFirst; // Boolean to indicate if it's the first time pinning
  let toUploadObject; // Object that will be pinned to Pinata

  const timestamp = Date.now(); // Current timestamp

  // If the previous CID is "NULL", this means it's the first time pinning
  if (previousCID == "NULL") {
    isFirst = true;
    // Create an initial object with 'latest' prices and an empty 'historical' field
    toUploadObject = {
      latest: {
        timestamp: timestamp, // Current timestamp for 'latest'
        prices: latestPrices, // Latest prices
      },
      historical: {}, // Empty historical data initially
    };
  } else {
    isFirst = false; // Not the first time pinning

    // Fetch the previous object from Pinata using its CID
    const res = await axios.get(`https://${GATEWAY}/ipfs/${previousCID}`);
    const previousObject = res.data; // Get the previous object data

    const previousTimestamp = previousObject.latest.timestamp; // Timestamp of the last 'latest' data
    const previousPrices = previousObject.latest.prices; // Prices of the last 'latest' data
    const previousHistorical = previousObject.historical; // Historical data from the previous object

    // Add the previous 'latest' data to 'historical'
    const updatedHistorical = previousHistorical;
    updatedHistorical[previousTimestamp] = previousPrices;

    // Create the new object to upload, with updated historical and latest prices
    toUploadObject = {
      latest: {
        timestamp: timestamp, // Current timestamp for 'latest'
        prices: latestPrices, // New latest prices
      },
      historical: updatedHistorical, // Updated historical data
    };
  }

  console.log("Fresh Historical :", isFirst); // Log if it's the first historical data upload

  // Remove any historical data that is older than 24 hours
  removeOldTtimestamps(toUploadObject);
  console.log("Removed Historical Data > 24hrs (if any).");

  // Options for making the POST request to Pinata API to pin the object
  const options = {
    method: "POST",
    headers: {
      accept: "application/json", // Expecting JSON response
      "content-type": "application/json", // Sending JSON data
      authorization: `Bearer ${JWT}`, // Authorization header with JWT token
    },
    body: JSON.stringify({
      pinataContent: toUploadObject, // The object to be pinned to IPFS
      pinataMetadata: { name: `historical_${timestamp}.json` }, // Metadata for the pinned object
    }),
  };

  // Send the data to Pinata and pin the JSON to IPFS
  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    options
  );
  const data = await response.json(); // Parse the response to get the IPFS hash
  console.log("Pinned Historical Data.");
  console.log(data); // Log the data returned from Pinata

  // Unpin the previous CID from Pinata to avoid unnecessary storage usage
  await unpin(previousCID, "Historical");

  return data.IpfsHash; // Return the new IPFS hash for the pinned data
}

module.exports = pinHistoricalObject; // Export the function for use in other modules
