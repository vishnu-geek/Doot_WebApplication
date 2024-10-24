// Importing supabase for authentication and database access
const { supabase } = require("../../../../utils/helper/init/InitSupabase.js");
// Importing clients for signature verification on testnet and mainnet
const {
  testnetSignatureClient,
  mainnetSignatureClient,
} = require("../../../../utils/helper/SignatureClient.js");

// Getting the API interface key from environment variables
const KEY = process.env.NEXT_PUBLIC_API_INTERFACE_KEY;

export default async function handler(req, res) {
  // Parsing the signed message from the request headers
  const signHeader = JSON.parse(req.headers.signed);
  // Getting the authorization header
  const authHeader = req.headers.authorization;

  // Checking if the authorization header matches the expected API key
  if ("Bearer " + KEY != authHeader) {
    return res.status(401).json({ status: "Unauthorized." }); // Unauthorized if the API key is invalid
  }

  // Proceed if the signed message is found in the headers
  if (signHeader) {
    // Extracting the timestamp from the signed message
    const timestamp = signHeader.timestamp;
    const currentTimestamp = Date.now(); // Getting the current timestamp

    // Calculating the difference between current time and timestamp from the signed message
    const diffMillis = currentTimestamp - timestamp;
    const diffMins = diffMillis / (1000 * 60); // Converting the difference to minutes

    // If the timestamp difference exceeds 60 minutes, reject the request
    if (diffMins > 60) {
      return res
        .status(401)
        .json({ status: "Timestamp out of the accepted range." });
    }

    // Message template that needs to be signed to verify ownership of the wallet
    const toVerifyMessage = `Sign this message to prove you have access to this wallet in order to sign in to doot.foundation/dashboard. This won't cost you any Mina. Timestamp:${timestamp}`;
    
    // Body for signature verification containing the message, public key, and signature
    const verifyBody = {
      data: toVerifyMessage,
      publicKey: signHeader.publicKey,
      signature: signHeader.signature,
    };

    // Verifying the signature on the testnet and mainnet
    const testnetOriginsVerified =
      testnetSignatureClient.verifyMessage(verifyBody);
    const mainnetOriginsVerified =
      mainnetSignatureClient.verifyMessage(verifyBody);

    // If the signature is invalid on both networks, reject the request
    if (!testnetOriginsVerified && !mainnetOriginsVerified) {
      return res.status(401).json({ status: "Signature Failed." });
    }

    // Signing in to Supabase using email and password stored in environment variables
    const MAIL = process.env.SUPABASE_USER;
    const PASS = process.env.SUPABASE_USER_PASS;

    await supabase.auth.signInWithPassword({
      email: MAIL,
      password: PASS,
    });

    // Querying the "Auro_Login" table for a user with the matching public key
    const { data: select_data, error: select_error } = await supabase
      .from("Auro_Login")
      .select("*")
      .eq("address", signHeader.publicKey);

    // Signing out from Supabase after the query
    await supabase.auth.signOut();

    // If a user with the given public key is found, return their data
    if (select_data.length == 1) {
      return res.status(200).json({
        status: true,
        data: select_data[0],
        message: "User data found.",
      });
    } else {
      // If no user data is found, return an appropriate response
      return res
        .status(200)
        .json({ status: false, data: null, message: "User data not found." });
    }
  }

  // If the signed message is not found in the header, return an error
  return res.status(400).json({
    stats: 400,
    data: null,
    message:
      "ERR! Signature not found in header. Header should include 'Signed:[...]'.",
  });
}
