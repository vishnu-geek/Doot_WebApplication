const JWT = process.env.PINATA_JWT;// Fetching the JWT (JSON Web Token) for Pinata API from environment variables

async function unpin(cid) {
  // Check if the cid is not "NULL", meaning there is something to unpin.
  if (cid != "NULL") {
    try {
      // Set up the options for the DELETE request to unpin the object from Pinata.
      const options = {
        method: "DELETE", // HTTP method is DELETE for removing the pinned object.
        headers: { 
          accept: "application/json", // Specify JSON format.
          authorization: `Bearer ${JWT}` // Use the JWT token for authorization in the request.
        },
      };

      // Make a DELETE request to Pinata's API to unpin the content with the given CID.
      const deleteResponse = await fetch(
        `https://api.pinata.cloud/pinning/unpin/${cid}`, // Pinata endpoint for unpinning based on the CID.
        options
      );

      // Log the status of the response (e.g., "OK", "Not Found") from the unpin request.
      console.log(deleteResponse.statusText);

      // Log a success message along with the CID of the file that was successfully unpinned.
      console.log(`SUCCESS DELETE PIN : ${cid}\n`);
    } catch (error) {
      // If there is an error during the unpinning process, log the error message and details.
      console.log(`ERROR DELETE PIN : ${cid}`);
      console.log(error);
    }
  } else {
    // If the CID is "NULL", log that there is nothing to unpin.
    console.log("Nothing to unpin.");
  }
}

// Export the unpin function so it can be used in other parts of the application.
module.exports = unpin;
