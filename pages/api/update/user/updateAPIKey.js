const { supabase } = require("../../../../utils/helper/init/InitSupabase.js"); // Importing the Supabase client
const uuid = require("uuid"); // Importing the UUID library for generating and validating unique keys
const uuidv4 = uuid.v4; // Alias for generating version 4 UUIDs
const uuidValidate = uuid.validate; // Alias for validating UUIDs

const KEY = process.env.NEXT_PUBLIC_API_INTERFACE_KEY; // Retrieving the API interface key from environment variables

// Main handler function for processing incoming requests
export default async function handler(req, res) {
  const authHeader = req.headers.authorization; // Extracting the authorization header
  const userInformation = JSON.parse(req.headers.user); // Parsing user information from the request headers

  // Checking if the provided authorization header matches the expected key
  if ("Bearer " + KEY != authHeader) {
    return res.status(401).json("Unauthorized."); // Returning 401 if unauthorized
  }

  if (userInformation) {
    const publicKey = userInformation.address; // Extracting the public key from user information
    const key = userInformation.key; // Extracting the original API key from user information
    console.log(publicKey, "called reset with original key :", key); // Logging the public key and original key

    const MAIL = process.env.SUPABASE_USER; // Retrieving Supabase user email from environment variables
    const PASS = process.env.SUPABASE_USER_PASS; // Retrieving Supabase user password from environment variables

    // Signing in to Supabase with the provided email and password
    await supabase.auth.signInWithPassword({
      email: MAIL,
      password: PASS,
    });

    // Selecting existing records in the "Auro_Login" table that match the provided original key
    const { data: select_data, error: select_error } = await supabase
      .from("Auro_Login")
      .select("generated_key, address")
      .eq("generated_key", key);

    // Checking if the key is valid and matches the associated address
    if (
      select_data.length == 0 || // No records found
      !uuidValidate(key) || // Invalid UUID
      select_data[0]?.address != publicKey // Address mismatch
    ) {
      return res.status(401).json("Unauthorized."); // Returning 401 if unauthorized
    }

    // Generating a new unique key using UUID
    const updatedKey = uuidv4();
    // Updating the generated key in the "Auro_Login" table
    const { data, error } = await supabase
      .from("Auro_Login")
      .update({ generated_key: updatedKey })
      .eq("generated_key", key);

    await supabase.auth.signOut(); // Signing out from Supabase

    // Returning a success response with the updated API key
    return res.status(200).json({
      status: true,
      data: updatedKey,
      message: "Updated API key successfully.",
    });
  } else
    // Returning a 400 error if user information is missing in the header
    return res.status(400).json({
      status: 400,
      message:
        "ERR! User information not found in header. Header should include 'User:[...]'.",
    });
}
