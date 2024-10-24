const { signatureClient } = require("../../../utils/helper/SignatureClient"); // Importing the signature client for verification
const { ORACLE_PUBLIC_KEY } = require("../../../utils/constants/info"); // Importing the oracle's public key

const { CircuitString } = require("o1js"); // Importing CircuitString for hashing strings

// Main handler function for processing incoming requests
export default function handler(req, res) {
  const { price, signature, url, decimals, timestamp } = req.query; // Extracting parameters from the query

  try {
    // Hashing the URL and converting it to a BigInt
    const fieldURL = BigInt(CircuitString.fromString(url).hash());
    const fieldPrice = BigInt(price); // Converting price to BigInt
    const fieldDecimals = BigInt(decimals); // Converting decimals to BigInt
    const fieldTimestamp = BigInt(timestamp); // Converting timestamp to BigInt

    // Constructing the object to verify the signature
    const verifyBody = {
      signature: signature, // The received signature
      publicKey: ORACLE_PUBLIC_KEY, // The oracle's public key
      data: [fieldURL, fieldPrice, fieldDecimals, fieldTimestamp], // Data to verify
    };

    console.log(verifyBody); // Logging the verification body for debugging

    // Verifying the signature using the signature client
    const originsVerified = signatureClient.verifyFields(verifyBody);

    // Checking the result of the signature verification
    if (!originsVerified) return res.status(201).json({ status: 0 }); // Returning status 0 if verification fails
    else return res.status(200).json({ status: 1 }); // Returning status 1 if verification succeeds
  } catch (err) {
    // Handling any errors that occur during the process
    return res.status(200).json({ status: 0 }); // Returning status 0 in case of an error
  }
}
