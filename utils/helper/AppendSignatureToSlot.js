const {
  TOKEN_TO_SIGNED_SLOT,
  MINA_MAX_SIGNED_SLOT_CACHE,
  HISTORICAL_MAX_SIGNED_SLOT_CACHE,
} = require("../constants/info");
// Imports constants that map tokens to signed slot data, the maximum number of signed slots within 2 hours (MINA), and the maximum number of signed slots within the past 30 minutes (historical).

const { redis } = require("./init/InitRedis");
// Redis is being used to cache the signed slot data. This import initializes Redis for interacting with the cache.

async function appendSignatureToSlot(
  token,
  tokenDetails,
  signature,
  publicKey
) {
  // This function appends a user’s signature (endorsement) to a slot for a specific token, updating its state based on the provided public key and signature.

  const lastUpdatedSlotInfo = await redis.get(TOKEN_TO_SIGNED_SLOT[token]);
  // Retrieves the last known signed slot information for the token from Redis. 
  // If no slot exists, it will return `NULL`.

  let finalState = lastUpdatedSlotInfo;
  // Assigns the retrieved slot information to the `finalState` variable, which will be updated throughout the function.

  // Bootstrap a new slot.
  if (finalState == "NULL") {
    // If the slot has never been initialized (or is empty), create a new one.

    console.log(`Running fresh slot for ${token}.`);
    // Logs the creation of a fresh slot for the given token.

    finalState = tokenDetails;
    // Sets `finalState` to the initial `tokenDetails` (contains the structure of the token’s data).

    finalState["community"] = {
      [publicKey]: signature,
      // Creates a new 'community' object where the `publicKey` is used as the key, and the user's `signature` is added.
    };
  } else {
    // Endorse an existing slot.
    console.log(`Updating existing slot for ${token}.`);
    // If the slot already exists, update the slot with the new signature.

    const updatedState = finalState.community;
    // Retrieves the existing community state from the current slot.

    updatedState[publicKey] = signature;
    // Adds or updates the signature for the public key in the community's state.

    finalState.community = updatedState;
    // Assigns the updated community back to the `finalState`.
  }

  // IF THE CURRENT SLOT HAS MORE ENDORSEMENTS THAN ANY OTHER SLOTS IN THE PAST 30 MINUTES IT REPLACES THE LEAD.
  const currentMaxHistoricalSlot = await redis.get(
    HISTORICAL_MAX_SIGNED_SLOT_CACHE
  );
  // Retrieves the cached data of the most endorsed slot in the past 30 minutes.

  if (
    Object.keys(finalState.community).length >
    Object.keys(currentMaxHistoricalSlot[token].community).length
  ) {
    // If the current slot's endorsements exceed the endorsements of the historical slot in the past 30 minutes:
    
    currentMaxHistoricalSlot[token] = finalState;
    // Updates the historical max signed slot cache with the current slot.

    await redis.set(HISTORICAL_MAX_SIGNED_SLOT_CACHE, currentMaxHistoricalSlot);
    // Saves the updated historical max slot data in Redis.

    console.log("UPDATED HISTORICAL MAX SIGNED SLOT INFO.");
    // Logs that the historical max signed slot has been updated.
  }

  // IF THE CURRENT SLOT HAS MORE ENDORSEMENTS THAN ANY OTHER SLOTS IN THE PAST 2HRS IT REPLACES THE LEAD.
  const currentMaxMinaSlot = await redis.get(MINA_MAX_SIGNED_SLOT_CACHE);
  // Retrieves the cached data of the most endorsed slot in the past 2 hours (MINA cache).

  if (
    Object.keys(finalState.community).length >
    Object.keys(currentMaxMinaSlot[token].community).length
  ) {
    // If the current slot's endorsements exceed the endorsements of the MINA max slot in the past 2 hours:

    currentMaxMinaSlot[token] = finalState;
    // Updates the MINA max signed slot cache with the current slot.

    await redis.set(MINA_MAX_SIGNED_SLOT_CACHE, currentMaxMinaSlot);
    // Saves the updated MINA max slot data in Redis.

    console.log("UPDATED MINA MAX SIGNED SLOT INFO.");
    // Logs that the MINA max signed slot has been updated.
  }

  await redis.set(TOKEN_TO_SIGNED_SLOT[token], finalState);
  // Updates the Redis cache with the new final state of the current slot for the token.

  console.log(publicKey, "joined", token, "consensus.", "\n");
  // Logs that the `publicKey` has joined the consensus for the given token.

  return;
  // Function returns after completing the update.
}

module.exports = appendSignatureToSlot;
// Exports the `appendSignatureToSlot` function so it can be used in other modules.
