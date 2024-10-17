const { AggregationModule } = require("./AggregationModule");
// Importing the AggregationModule, which handles the aggregation of prices and proofs.

const { processFloatString } = require("./CallAndSignAPICalls");
// Importing the processFloatString function to convert float values to a specific format.

async function generateProofCompatiblePrices(prices) {
  // This asynchronous function converts an array of prices into a format compatible for proof generation.
  
  return prices.map((price) => 
    BigInt(processFloatString(price.toString()))
    // Maps each price in the array to a BigInt after converting it to a string and processing it for compatibility.
  );
}

async function generateAggregationProof(prices, lastProof, isBase) {
  // This asynchronous function generates an aggregation proof from the provided prices.
  
  const proofCompatiblePrices = await generateProofCompatiblePrices(prices);
  // Calls generateProofCompatiblePrices to convert prices to a compatible format.

  const aggregationResults = await AggregationModule(
    proofCompatiblePrices,
    lastProof,
    isBase
  );
  // Calls the AggregationModule with the compatible prices, last proof, and a flag indicating if it's a base case.

  return aggregationResults;
  // Returns the results of the aggregation proof.
}

module.exports = generateAggregationProof;
// Exports the generateAggregationProof function for use in other modules.
