const {
  signatureClient,
  mainnetSignatureClient,
} = require("../../../utils/helper/SignatureClient"); // Importing signature clients for verification
const { ORACLE_PUBLIC_KEY } = require("../../../utils/constants/info"); // Importing the public key for the oracle

// Main handler function for processing incoming requests
export default function handler(req, res) {
  const { price, signature } = req.query; // Extracting price and signature from the query parameters

  try {
    // Constructing the object to verify the signature
    const verifyBody = {
      signature: signature, // The received signature
      publicKey: ORACLE_PUBLIC_KEY, // The oracle's public key
      data: [BigInt(price)], // The price wrapped in a BigInt to handle large numbers
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
