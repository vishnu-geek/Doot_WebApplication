const axios = require("axios");
const JWT = process.env.PINATA_JWT;
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY;

import unpin from "./Unpin";

function removeOldTimestamps(obj) {
  const currentTime = new Date();
  const oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds

  Object.keys(obj.historical).forEach((key) => {
    let timestamp = new Date(Number(key));
    let diff = currentTime - timestamp;

    if (diff > oneDay) {
      delete obj.historical[key];
    }
  });
}

export async function pinHistoricalObject(previousCID, latestPrices) {
  let isFirst;
  let toUploadObject;

  const timestamp = Date.now();

  if (previousCID == "NULL") {
    isFirst = true;
    toUploadObject = {
      latest: {
        timestamp: timestamp,
        prices: latestPrices,
      },
      historical: {},
    };
  } else {
    isFirst = false;

    const res = await axios.get(`https://${GATEWAY}/ipfs/${previousCID}`);
    const previousObject = res.data;

    const previousTimestamp = previousObject.latest.timestamp;
    const previousPrices = previousObject.latest.prices;
    const previousHistorical = previousObject.historical;

    const updatedHistorical = previousHistorical;
    updatedHistorical[previousTimestamp] = previousPrices;

    toUploadObject = {
      latest: {
        timestamp: timestamp,
        prices: latestPrices,
      },
      historical: updatedHistorical,
    };
  }

  console.log("IsFirst :", isFirst);

  removeOldTimestamps(toUploadObject);
  console.log("Removed Older Timestamps!");

  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${JWT}`,
    },
    body: JSON.stringify({
      pinataContent: toUploadObject,
      pinataMetadata: { name: `historical_${timestamp}.json` },
    }),
  };

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    options
  );
  const data = await response.json();
  console.log(data);

  await unpin(previousCID, "Historical");

  return data.IpfsHash;
}
