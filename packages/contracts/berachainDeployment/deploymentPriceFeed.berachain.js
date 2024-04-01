const BerachainDeploymentHelper = require("../utils/berachainDeploymentHelpers.js")

async function berachainPriceFeedDeploy(configParams) {
    const deployerWallet = (await ethers.getSigners())[0]
    const stdh = new BerachainDeploymentHelper(configParams, deployerWallet)
    const deploymentState = stdh.loadPreviousDeployment()
    await stdh.deployPriceFeedBeraBorrow(deploymentState)
}

module.exports = {
    berachainPriceFeedDeploy
}
  