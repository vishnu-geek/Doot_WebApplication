//This file is setting up two Mina blockchain clients for signing transactions, 
//one for the testnet (test environment) and the other for the mainnet (live environment). 
//It uses the mina-signer library, which is responsible for generating cryptographic signatures required to validate and authorize transactions on the Mina blockchain
const Client = require("mina-signer");
const testnetSignatureClient = new Client({ network: "testnet" });
const mainnetSignatureClient = new Client({ network: "mainnet" });

module.exports = { testnetSignatureClient, mainnetSignatureClient };
