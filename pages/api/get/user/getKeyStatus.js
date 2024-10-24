// Import Supabase client
const { supabase } = require("../../../../utils/helper/init/InitSupabase.js");

export default async function handler(req, res) {
  // Retrieve the Authorization header from the request
  const authHeader = req.headers.authorization;

  // Check if the Authorization header is present
  if (authHeader) {
    // Fetch Supabase credentials from environment variables
    const MAIL = process.env.SUPABASE_USER;
    const PASS = process.env.SUPABASE_USER_PASS;

    // Sign in to Supabase with the credentials
    await supabase.auth.signInWithPassword({
      email: MAIL,
      password: PASS,
    });

    // Extract API key from the Authorization header
    const key = authHeader.split(" ")[1];

    // Query the 'Auro_Login' table for the matching API key
    const { data: select_data, error: select_error } = await supabase
      .from("Auro_Login")
      .select("generated_key")
      .eq("generated_key", key);

    // Sign out from Supabase after the operation
    await supabase.auth.signOut();

    // If the key exists, respond with success
    if (select_data[0].length != 0)
      return res.status(200).json({ status: true, message: "Valid API Key." });
    else
      // If the key does not exist, respond with invalid API key
      return res
        .status(200)
        .json({ status: false, message: "Invalid API Key." });
  }

  // If the Authorization header is missing, return an error response
  return res.status(400).json({
    status: 400,
    message:
      "ERR! API Key not found in header. Header should include 'Authorization:Bearer [API_KEY]'. For more information visit : https://doot.foundation/dashboard.",
  });
}
