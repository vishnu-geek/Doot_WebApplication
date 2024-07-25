const { redis } = require("../../../../utils/helper/InitRedis");
const { HISTORICAL_CID_CACHE } = require("../../../../utils/constants/info");

export default async function handler(req, res) {
  const data = await redis.get(HISTORICAL_CID_CACHE);
  return res.status(200).json({ data: data });
}
