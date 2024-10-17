function normalizePrice(subone, str) {
  // Converts a string 'str' into a number, divides by 10^10 to normalize the price,
  // and rounds the number based on the 'subone' flag.
  let num = parseInt(str); 
  num = num / Math.pow(10, 10);
  num = subone ? Math.round(num * 1000) / 1000 : Math.round(num * 100) / 100;
  return num; // Returns the normalized and rounded price.
}


async function generateGraphData(//
  subone,
  latest,
  historical_latest,
  historical_historical
) {
  // Initializes minPrice and maxPrice to track the range of prices.
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  // Combines historical and latest price arrays into one array.
  const combinedArray = [
    ...historical_historical,  // Historical data further back in time.
    ...historical_latest,      // More recent historical data.
    ...latest,                 // The latest price data.
  ];

  // Iterates over the combined array to normalize prices and update min/max prices.
  combinedArray.forEach((item) => {
    if (item && item.price != undefined) {
      const price = normalizePrice(subone, item.price); // Normalizes price.
      minPrice = Math.min(minPrice, price); // Updates minimum price.
      maxPrice = Math.max(maxPrice, price); // Updates maximum price.
    }
  });

  // Determines the first historical price (closest to 24 hours ago). 
  // Falls back to the latest price if historical data is missing.
  let firstHistoricalPrice;
  if (historical_historical[0])
    firstHistoricalPrice = parseFloat(historical_historical[0].price);
  else if (historical_latest[0])
    firstHistoricalPrice = parseFloat(historical_latest[0].price);
  else firstHistoricalPrice = parseFloat(latest[0].price);

  // Fetches the immediate/latest price from the 'latest' array.
  const immediatePrice = parseFloat(latest[0].price);

  // Calculates the percentage change in price over the past 24 hours.
  const percentageChange =
    ((immediatePrice - firstHistoricalPrice) / firstHistoricalPrice) * 100;

  // Formats the percentage change as a string with two decimal places and a '+' or '-' sign.
  const formattedPercentageChange =
    percentageChange >= 0
      ? `+${percentageChange.toFixed(2)}%`
      : `${percentageChange.toFixed(2)}%`;

  // Maps the combined data array to return an array of objects with 'timestamp' and normalized 'price'.
  const finalArray = combinedArray.map((item) => ({
    timestamp: item.aggregationTimestamp, // Uses the aggregation timestamp.
    price: normalizePrice(subone, item.price), // Normalizes the price.
  }));

  console.log("Generated graph data."); // Logs when graph data generation is complete.

  // Returns the final data array, minimum price, maximum price, and formatted percentage change.
  return [finalArray, minPrice, maxPrice, formattedPercentageChange];
}

module.exports = generateGraphData;
