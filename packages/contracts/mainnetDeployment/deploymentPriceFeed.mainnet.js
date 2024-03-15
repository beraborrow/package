const MainnetDeploymentHelper = require("../utils/mainnetDeploymentHelpers.js")

async function mainnetPriceFeedDeploy(configParams) {
    const deployerWallet = (await ethers.getSigners())[0]
    const stdh = new MainnetDeploymentHelper(configParams, deployerWallet)
    const deploymentState = stdh.loadPreviousDeployment()
    await stdh.deployPriceFeedBeraBorrow(deploymentState)
}

module.exports = {
    mainnetPriceFeedDeploy
}
  