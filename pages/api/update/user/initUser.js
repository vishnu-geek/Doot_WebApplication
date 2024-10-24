const { supabase } = require("../../../../utils/helper/init/InitSupabase.js"); // Importing Supabase client
const uuid = require("uuid"); // Importing UUID library for generating unique keys
const uuidv4 = uuid.v4; // Alias for generating version 4 UUIDs

const KEY = process.env.NEXT_PUBLIC_API_INTERFACE_KEY; // Retrieving the API interface key from environment variables

// Main handler function for processing incoming requests
export default async function handler(req, res) {
  const authHeader = req.headers.authorization; // Extracting the authorization header
  const { address } = req.query; // Extracting the address from query parameters

  // Checking if the provided authorization header matches the expected key
  if ("Bearer " + KEY != authHeader) {
    return res.status(401).json("Unauthorized."); // Returning 401 if unauthorized
  }

  if (address) {
    const MAIL = process.env.SUPABASE_USER; // Retrieving Supabase user email from environment variables
    const PASS = process.env.SUPABASE_USER_PASS; // Retrieving Supabase user password from environment variables

    // Signing in to Supabase with the provided email and password
    await supabase.auth.signInWithPassword({
      email: MAIL,
      password: PASS,
    });

    // Selecting existing records in the "Auro_Login" table that match the provided address
    const { data: select_data, error: select_error } = await supabase
      .from("Auro_Login")
      .select("address")
      .eq("address", address);

    // Checking if the address already exists in the database
    if (select_data != null && select_data.length != 0) {
      await supabase.auth.signOut(); // Signing out from Supabase
      return res
        .status(200)
        .json({ status: true, message: "Already Exists.", key: "" }); // Returning 200 if the address exists
    }

    // Generating a new unique key using UUID
    const assignedKey = uuidv4();
    // Inserting the new address and generated key into the "Auro_Login" table
    await supabase
      .from("Auro_Login")
      .insert([{ address: address, generated_key: assignedKey }]);

    await supabase.auth.signOut(); // Signing out from Supabase

    // Returning a success response with the generated API key
    return res.status(201).json({
      status: true,
      message: "Generated API key successfully.",
      publicKey: address,
      data: assignedKey,
    });
  } else
    // Returning a 400 error if the address query parameter is missing
    return res.status(400).json({
      status: 400,
      publicKey: address,
      message: "ERR! Query parameter missing(address).",
      data: null,
    });
}
