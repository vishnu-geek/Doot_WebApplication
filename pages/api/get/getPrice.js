const MAIL = process.env.SUPABASE_USER;
const PASS = process.env.SUPABASE_USER_PASS;

import { supabase } from "../../../utils/helper/InitSupabase.js";
import { getAssetCache } from "../../../utils/helper/CacheHandler.js";

import { validate as uuidValidate } from "uuid";

export default async function handler(req, res) {
  // Retrieve data from the cache
  const authHeader = req.headers.authorization;
  const { address, token } = req.query;

  await supabase.auth.signInWithPassword({
    email: MAIL,
    password: PASS,
  });

  const { data: select_data, error: select_error } = await supabase
    .from("Auro_Login")
    .select("generated_key")
    .eq("address", address);

  await supabase.auth.signOut();

  if (
    select_data.length == 0 ||
    "Bearer " + select_data[0].generated_key != authHeader ||
    !uuidValidate(authHeader.split(" ")[1])
  ) {
    res.status(401).json("Unauthorized.");
    return;
  }

  const cachedData = await getAssetCache(token.toLowerCase());

  if (cachedData) {
    return res
      .status(200)
      .json({ price: cachedData, asset: token, timestamp: Date.now() });
  } else {
    return res.status(404).json({ message: "Cached data not found." });
  }
}
