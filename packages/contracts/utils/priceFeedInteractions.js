// Vanilla node.js script.

/* 
* Script now deprecated. 
* TODO: replace with a script that deploys a PriceFeed.sol instance to berachain, and interacts with it 
* (i.e. gets the price).
*
*/


// const ethers = require('ethers');
// const oracleABIs = require('./oracleABIs.js')
// const secrets = require ('./../secrets.js')
// const web3 = require('web3')

// const privateKey = secrets.privateKey

// const BerachainAggregatorABI = oracleABIs.BerachainAggregator
// const TestnetAggregatorABI = oracleABIs.TestnetAggregator
// const BerachainPriceFeedABI = oracleABIs.BerachainPriceFeed
// const TestnetPriceFeedABI = oracleABIs.TestnetPriceFeed

// const getGasFromTxHash = async (provider, txHash) => {
//   console.log("tx hash is")
//   console.log(txHash)
//   const receipt = await provider.getTransactionReceipt(txHash)
//   const gas = receipt.gasUsed
//   return gas
// }

// const berachainProvider = ethers.getDefaultProvider();
// const testnetProvider = ethers.getDefaultProvider('testnet');

// const testnetWallet = new ethers.Wallet(privateKey, testnetProvider)
// const berachainWallet = new ethers.Wallet(privateKey, berachainProvider)

// // Addresses of the deployed Chainlink aggregator reference contracts
// const aggregatorAddressBerachain = "0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9";
// const aggregatorAddressTestnet = "0x8468b2bDCE073A157E560AA4D9CcF6dB1DB98507"

// // Addresses of our deployed PriceFeeds
// const priceFeedAddressBerachain = "0xfD7838852b42dE1F9189025523e7A7150b81df72"
// const priceFeedAddressTestnet = "0xEF23fa01A1cFf44058495ea20daC9D64f285ffc4"

// // Instantiate contract objects
// const berachainAggregator = new ethers.Contract(aggregatorAddressBerachain, BerachainAggregatorABI, berachainWallet);
// const testnetAggregator = new ethers.Contract(aggregatorAddressTestnet, TestnetAggregatorABI, testnetWallet);

// const berachainPriceFeed = new ethers.Contract(priceFeedAddressBerachain, BerachainPriceFeedABI, berachainWallet);
// const testnetPriceFeed = new ethers.Contract(priceFeedAddressTestnet, TestnetPriceFeedABI, testnetWallet);

// (async () => {

//     // --- Ropsten Testnet ---

//    // Set the Trove Manager address in the testnet PriceFeed
//     // const res = await testnetPriceFeed.setTroveManagerAddress('0x405143dAe9a8a703a1fE82ad4B65BBFE5505AF63')
//     // res.wait()
//     const recordedTroveManagerAddressTestnet = await testnetPriceFeed.troveManagerAddress()
//     console.log(`recorded TroveManager Address is ${recordedTroveManagerAddressTestnet}`)
   

//     // Call the testnet Chainlink aggregator directly
//     const price_aggregatorTestnet = (await testnetAggregator.latestAnswer()).toString();
//     const timestamp_aggregatorTestnet = (await testnetAggregator.latestTimestamp()).toString()
//     const latestAnswerID_aggregatorTestnet = (await testnetAggregator.latestRound()).toString()
//     console.log(`Testnet: Latest iBGT:USD price from aggregator: ${price_aggregatorTestnet}`);
//     console.log(`Testnet: Timestamp of latest price from aggregator: ${timestamp_aggregatorTestnet}`);
//     console.log(`Testnet: ID of latest price answer from  aggregator: ${latestAnswerID_aggregatorTestnet}`)
//     console.log('\n')

//     // Call our testnet PriceFeed - get current price, and timestamp
//     const price_PriceFeedTestnet = await testnetPriceFeed.getLatestPrice_Testnet()
//     const timestamp_PriceFeedTestnet = await testnetPriceFeed.getLatestTimestamp_Testnet()
//     console.log(`Testnet: Latest iBGT:USD price from deployed PriceFeed: ${price_PriceFeedTestnet}`)
//     console.log(`Testnet: Timestamp of latest price from deployed PriceFeed: ${timestamp_PriceFeedTestnet}`)
//     console.log('\n')
   
//     let price = await testnetPriceFeed.getPrice()
//     console.log (`stored'price' variable in testnet PriceFeed contract is ${price}`)

//    // Call our testnet PriceFeed - get recent past prices and timestamps
//     for (i = 5; i >= 1; i--) {
//         const previousPrice_PriceFeedTestnet = await testnetPriceFeed.getPreviousPrice_Testnet(i)
//         const previousTimestamp_PriceFeedTestnet = await testnetPriceFeed.getPreviousTimestamp_Testnet(i)
//         console.log(`Testnet: Price from ${i} rounds ago is: ${previousPrice_PriceFeedTestnet}`)
//         console.log(`Testnet: Timestamp of price from ${i} rounds ago is: ${previousTimestamp_PriceFeedTestnet}`)
//         console.log('\n')
//       }

//     // // --- Berachain ---

//     // Calling the berachain Chainlink aggregator directly 
//     const price_aggregatorBerachain = (await berachainAggregator.currentAnswer()).toString();
//     const timestamp_aggregatorBerachain = (await berachainAggregator.updatedHeight()).toString()
//     const latestAnswerID_aggregatorBerachain = (await berachainAggregator.latestCompletedAnswer()).toString()
//     console.log(`Berachain: Latest iBGT:USD price from aggregator: ${price_aggregatorBerachain}`);
//     console.log(`Berachain: Timestamp of latest price from aggregator: ${timestamp_aggregatorBerachain}`);
//     console.log(`Berachain: ID of latest price answer from aggregator: ${latestAnswerID_aggregatorBerachain}`)
//     console.log('\n')

//     // Call our berachain PriceFeed
//     const price_PriceFeedBerachain = (await berachainPriceFeed.getLatestPrice()).toString()
//     const timestap_PriceFeedBerachain = (await berachainPriceFeed.getLatestTimestamp()).toString()
//     const latestAnswerID_PriceFeedBerachain = (await berachainPriceFeed.getLatestAnswerID()).toString()
//     console.log(`Berachain: Latest iBGT:USD price from deployed PriceFeed: ${price_PriceFeedBerachain}`)
//     console.log(`Berachain: Timestamp of latest price from deployed PriceFeed: ${timestap_PriceFeedBerachain}`)
//     console.log(`Berachain: ID of latest price answer from deployed PriceFeed: ${latestAnswerID_PriceFeedBerachain}`)
//     console.log('\n')

//     // --- Gas costs of updatePrice() ---

//     // console.log("Get gas costs")
//     // console.log("\n")

//     // Testnet - 30-35k gas
//     console.log("Call updatePrice() on Testnet")
//     const txResponseTestnet = await testnetPriceFeed.updatePrice_Testnet()
//     console.log("waiting for tx to be mined...")
//     txResponseTestnet.wait()
//     const gasTestnet = await getGasFromTxHash(testnetProvider, txResponseTestnet.hash)
//     console.log(`Testnet: updatePrice_testnet() gas cost: ${gasTestnet}`)
//     console.log('\n')

//     // // Berachain - 30-35k gas
//     console.log("Call updatePrice() on Berachain")
//     const txResponseBerachain = await berachainPriceFeed.updatePrice()
//     console.log("waiting for tx to be mined...")
//     txResponseBerachain.wait()
//     const gasBerachain = await getGasFromTxHash(berachainProvider, txResponseBerachain.hash)
//     console.log(`Testnet: updatePrice() gas cost: ${gasBerachain}`)

//     /* updatePrice() is a tx (21k) + SStore (5k) + emit event (1.5k) = 27.5k gas

//     Therefore, expected gas cost of a getLatestPrice() call is within a Trove function is (35k - 27.5k) 
//     = 7500 gas upper bound.
    
//     To check, deploy an instance of FunctionCaller contract to ropsten and berachain, 
//     with a wrapped getLatestPrice() call. */
// })();