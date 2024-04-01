const { berachainDeploy } = require('./berachainDeployment.js')
const { berachainPriceFeedDeploy } = require('./deploymentPriceFeed.berachain.js')
const configParams = require("./deploymentParams.berachain.js")

async function main() {
  await berachainPriceFeedDeploy(configParams)
  await berachainDeploy(configParams)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
