const { mainnetDeploy } = require('./mainnetDeployment.js')
const { mainnetPriceFeedDeploy } = require('./deploymentPriceFeed.mainnet.js')
const configParams = require("./deploymentParams.mainnet.js")

async function main() {
  // await mainnetPriceFeedDeploy(configParams)
  await mainnetDeploy(configParams)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
