// Function for incrementing the call counter for the current month
async function incrementCallCounter(obj) {
  const now = new Date(); // Get the current date and time
  const currentMonth = now.getMonth(); // Get the current month (0 = January, 11 = December)

  const months = Object.keys(obj); // Retrieve the keys (month names) from the object (e.g., 'January', 'February', etc.)

  // Get the key corresponding to the current month from the object
  const toIncrement = months[currentMonth];

  // Increment the counter for the current month by 1
  obj[toIncrement]++;

  // Return the updated object
  return obj;
}

module.exports = incrementCallCounter;
