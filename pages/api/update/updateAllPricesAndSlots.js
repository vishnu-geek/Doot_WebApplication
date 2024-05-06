const {
  TOKEN_TO_CACHE,
  TOKEN_TO_SIGNED_SLOT,
  ORACLE_PUBLIC_KEY,
} = require("../../../utils/constants/info.js");
const { redis } = require("../../../utils/helper/InitRedis.js");
const getPriceOf = require("../../../utils/helper/GetPriceOf.js");
const appendSignatureToSlot = require("../../../utils/helper/AppendSignatureToSlot");

async function PriceOf(token) {
  return new Promise((resolve) => {
    const results = getPriceOf(token);
    resolve(results);
  });
}

async function startFetchAndUpdates(tokens) {
  for (const token of tokens) {
    try {
      console.log("=======================\n", token);
      const results = await PriceOf(token);
      await redis.set(TOKEN_TO_CACHE[token], results[1]);
      await redis.set(TOKEN_TO_SIGNED_SLOT[token], "NULL");

      await appendSignatureToSlot(
        token,
        results[1],
        results[1].signature,
        ORACLE_PUBLIC_KEY
      );
    } catch (err) {
      console.log("Failed For", token);
    }
  }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json("Unauthorized");
    return;
  }

  const keys = Object.keys(TOKEN_TO_CACHE);
  await startFetchAndUpdates(keys);

  res.status(200).json({
    status: `Updated Prices Successfully!`,
    timestamp: Date.now(),
  });
}
