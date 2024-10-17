const axios = require("axios");
// Axios is a promise-based HTTP client for making requests to external APIs.

const _ = require("lodash");
// Lodash is a utility library providing helpful functions for data manipulation.

const DEPLOYER_KEY = process.env.DEPLOYER_KEY;
// The deployer key used for signing transactions, stored in environment variables.

const {
  signatureClient,
  testnetSignatureClient,
} = require("./SignatureClient");
// Importing signature clients for signing fields, used for creating cryptographic signatures.

const { CircuitString } = require("o1js");
// Importing CircuitString from o1js, which is used for handling string inputs in zero-knowledge proofs.

const { MULTIPLICATION_FACTOR } = require("../constants/info");
// A constant defining the factor by which to multiply the float values, used for precision in calculations.

/// MULTIPLY BY 10 AND DROP THE DECIMALS
function processFloatString(input) {
  // This function processes a string representation of a float value by multiplying it by a defined factor.

  const floatValue = parseFloat(input);
  // Converts the input string to a float.

  if (isNaN(floatValue)) {
    return "Invalid input";
    // Returns an error message if the input is not a valid number.
  }

  const multipliedValue = floatValue * Math.pow(10, MULTIPLICATION_FACTOR);
  // Multiplies the float value by 10 raised to the MULTIPLICATION_FACTOR.

  const integerValue = Math.floor(multipliedValue);
  // Floors the multiplied value to drop any decimals, converting it to an integer.

  const resultString = integerValue.toString();
  // Converts the integer value back to a string for return.

  return resultString;
}

function getTimestamp(data) {
  // This function converts a date string into a UNIX timestamp.

  const date = new Date(data);
  // Creates a new Date object from the input data.

  return Math.floor(date.getTime() / 1000);
  // Returns the timestamp in seconds by dividing the milliseconds by 1000.
}

async function callSignAPICall(url, resultPath, headerName) {
  // This asynchronous function calls an external API, retrieves a specific result, and returns a signature.

  var API_KEY =
    headerName == "X-CMC_PRO_API_KEY"
      ? process.env.CMC_KEY // Retrieves CoinMarketCap API key from environment variables.
      : headerName == "X-CoinAPI-Key"
      ? process.env.COIN_API_KEY // Retrieves CoinAPI key from environment variables.
      : headerName == "x-access-token"
      ? process.env.COIN_RANKING_KEY // Retrieves CoinRanking API key from environment variables.
      : headerName == "x-api-key"
      ? process.env.SWAP_ZONE_KEY // Retrieves Swap Zone API key from environment variables.
      : "";

  API_KEY = API_KEY.replace(/^'(.*)'$/, "$1");
  // Cleans the API_KEY to remove surrounding quotes if present.

  var header = { [headerName]: API_KEY };
  // Creates an object containing the API key to be used in the request headers.

  const response =
    headerName !== ""
      ? await axios.get(url, {
          headers: header, // Sends a GET request to the specified URL with headers.
        })
      : await axios.get(url);

  header = null;
  // Sets the header variable to null after the request to clean up.

  const price = _.get(response, resultPath);
  // Uses Lodash to safely retrieve the price from the response using the resultPath.

  var Price;
  if (headerName == "x-api-key") Price = String(price / 1000);
  // If the header is for the Swap Zone API, divides the price by 1000 for scaling.
  else Price = String(price);
  // Converts the price to a string.

  const Timestamp = getTimestamp(response.headers["date"]);
  // Gets the timestamp from the response headers and converts it to UNIX time.

  const fieldURL = BigInt(CircuitString.fromString(url).hash());
  // Creates a BigInt from the hash of the URL for cryptographic processing.

  const fieldPrice = BigInt(processFloatString(Price));
  // Processes the price string into a BigInt.

  const fieldDecimals = BigInt(MULTIPLICATION_FACTOR);
  // Converts the multiplication factor to BigInt for cryptographic processing.

  const fieldTimestamp = BigInt(Timestamp);
  // Converts the timestamp to BigInt for cryptographic processing.

  const signature = testnetSignatureClient.signFields(
    [fieldURL, fieldPrice, fieldDecimals, fieldTimestamp],
    DEPLOYER_KEY
  );
  // Signs the fields with the deployer key using the testnet signature client.

  // USED SINCE UNABLE TO TRANSFER BIGINT OVER REST API CALLS.
  var JsonCompatibleSignature = {};
  // Prepares an object to hold the signature data.

  JsonCompatibleSignature["signature"] = signature.signature;
  // Adds the signature to the JSON object.

  JsonCompatibleSignature["publicKey"] = signature.publicKey;
  // Adds the public key to the JSON object.

  JsonCompatibleSignature["data"] = signature.data[0].toString();
  // Adds the first data item from the signature to the JSON object as a string.

  return [Price, Timestamp, JsonCompatibleSignature, url];
  // Returns an array containing the processed price, timestamp, signature data, and URL.
}

module.exports = { callSignAPICall, processFloatString };
// Exports the functions for use in other modules.
