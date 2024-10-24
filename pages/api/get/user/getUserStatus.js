// Importing supabase for authentication and database access
const { supabase } = require("../../../../utils/helper/init/InitSupabase.js");

export default async function handler(req, res) {
  // Extracting the address query parameter from the request
  const { address } = req.query;

  // Check if the address parameter is provided
  if (address) {
    // Fetching the Supabase user email and password from environment variables
    const MAIL = process.env.SUPABASE_USER;
    const PASS = process.env.SUPABASE_USER_PASS;

    // Signing into Supabase using email and password
    await supabase.auth.signInWithPassword({
      email: MAIL,
      password: PASS,
    });

    // Querying the "Auro_Login" table for the provided address
    const { data: select_data, error: select_error } = await supabase
      .from("Auro_Login")
      .select("address")
      .eq("address", address);

    // Signing out of Supabase after performing the query
    await supabase.auth.signOut();

    // If data is found, return a success response indicating the public key exists
    if (select_data != null && select_data.length != 0) {
      return res
        .status(200)
        .json({ status: true, message: "Public key exists." });
    } else {
      // If no data is found, return a response indicating the public key does not exist
      return res
        .status(200)
        .json({ status: false, message: "Public Key does not exist." });
    }
  }

  // If the address parameter is missing, return an error response
  return res
    .status(400)
    .json({ status: 400, message: "ERR! Query parameter missing(address)." });
}
