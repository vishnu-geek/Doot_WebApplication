const getPriceOf = require("../../../utils/helper/GetPriceOf.js");
const { updateAssetCache } = require("../../../utils/helper/CacheHandler.js");

async function PriceOf(token) {
  return new Promise((resolve) => {
    const value = getPriceOf(token);
    resolve(value);
  });
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json("Unauthorized");
    return;
  }

  const { token } = req.query;
  const price = await PriceOf(token.toLowerCase());

  // await updateAssetCache(token, price);

  res.status(200).json({
    status: `Updated ${token} Successfully!`,
    price: price,
    timestamp: Date.now(),
  });
}
