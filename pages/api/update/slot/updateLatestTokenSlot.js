const { redis } = require("../../../../utils/helper/init/InitRedis"); // Importing Redis for cache storage

const { TOKEN_TO_CACHE } = require("../../../../utils/constants/info"); // Importing token cache constants
const {
  testnetSignatureClient,
  mainnetSignatureClient,
} = require("../../../../utils/helper/SignatureClient"); // Importing signature clients for verification
const appendSignatureToSlot = require("../../../../utils/helper/AppendSignatureToSlot"); // Importing function to append signatures

// Main handler function for processing incoming requests
export default async function handler(req, res) {
  const { signature, token } = req.query; // Destructuring signature and token from the query parameters

  // Retrieve cached data for the specified token from Redis
  const cachedData = await redis.get(TOKEN_TO_CACHE[token.toLowerCase()]);
  const toCheck = cachedData.signature; // Extracting the signature from cached data
  var originsVerified = false; // Flag to check if the origins are verified

  // Parsing the received signature to an object
  const compatibleReceivedSignatureObj = JSON.parse(signature);

  // Preparing the data to verify against the cached signature
  var toVerify = {
    data: toCheck.data.toString(),
    publicKey: toCheck.publicKey.toString(),
    signature: toCheck.signature.toString(),
  };
  toVerify = JSON.stringify(toVerify); // Converting to JSON string

  // Creating the body for verification
  const verifyBody = {
    data: toVerify,
    signature: compatibleReceivedSignatureObj.signature,
    publicKey: compatibleReceivedSignatureObj.publicKey,
  };

  // Verifying the message with the testnet signature client
  originsVerified = testnetSignatureClient.verifyMessage(verifyBody);
  // If verification fails, try with the mainnet signature client
  if (!originsVerified) {
    originsVerified = mainnetSignatureClient.verifyMessage(verifyBody);
    // If still unable to verify, return an error response
    if (!originsVerified) {
      return res.status(201).json({
        status: false,
        message: "ERR! Unable to verify signature origins.",
      });
    }
  }

  // Append the verified signature to the slot
  await appendSignatureToSlot(
    token.toLowerCase(),
    cachedData,
    compatibleReceivedSignatureObj,
    compatibleReceivedSignatureObj.publicKey
  );

  // Return a success response indicating successful consensus joining
  return res
    .status(201)
    .json({ status: true, message: "Successfully joined consensus." });
}
