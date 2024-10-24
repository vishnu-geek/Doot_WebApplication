//API to get the slot for the respective token
const { redis } = require("../../../../utils/helper/init/InitRedis");//Redis is used to store the cache memory
//variables to Map token to get the signed slot and get the symbol importing from info.js
const {
  TOKEN_TO_SIGNED_SLOT,
  TOKEN_TO_SYMBOL,
} = require("../../../../utils/constants/info");
//fetchung the API interface key from the env for authorization
const KEY = process.env.NEXT_PUBLIC_API_INTERFACE_KEY;

export default async function handler(req, res) {//exporting deafault func to icoming request or response
  const authHeader = req.headers.authorization;//variable to authenticate the header
  let { token } = req.query;//accessing the token witht the help of query
//
  if (token != undefined && !TOKEN_TO_SYMBOL[token])//checking for the condition if the conditon is true
    return res
      .status(400)
      .json({ status: 400, message: "ERR! Invalid token." });

  if ("Bearer " + KEY != authHeader) {//invalid authorization
    return res.status(401).json("Unauthorized.");
  }

  let cachedData = [{}];//declaration of an empty array to store the cached data 
  if (token != undefined) {//condn of a token if it is undefined
    token = token.toLowerCase();//converting the token to lowwer case
    const data = await redis.get(TOKEN_TO_SIGNED_SLOT[token]);//assigning the slot
    cachedData[0][token] = data;// assigning the first postion of an array to the token found
  } else {
    //if tokenn is undefined
    const keys = Object.keys(TOKEN_TO_SYMBOL);
    for (let key of keys) {
      const data = await redis.get(TOKEN_TO_SIGNED_SLOT[key]);
      cachedData[0][key] = data;
    }
  }

  return res.status(200).json({
    data: cachedData,
    asset: token ? token : "ALL",
    status: true,
    message: "Token slot information found.",
  });
}
