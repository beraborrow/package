// Test with:
// GAS_PRICE=70832172907 BLOCK_NUMBER=15122486 npx hardhat run berachainDeployment/aaveiBgtOracleDeployment.js --config hardhat.config.berachain-fork.js

// Deploy on berachain with:
// GAS_PRICE=40000000000 npx hardhat run berachainDeployment/aaveiBgtOracleDeployment.js --network berachain
// make sure you have the right private key for DEPLOYER_PRIVATEKEY in secrets.js

async function main() {
  // Uncomment for testing:
  /*
  const impersonateAddress = "0x31c57298578f7508B5982062cfEc5ec8BD346247";
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [ impersonateAddress ]
  });
  const deployerWallet = await ethers.provider.getSigner(impersonateAddress);
  const deployerWalletAddress = impersonateAddress;
  */

  const deployerWallet = (await ethers.getSigners())[0];
  const deployerWalletAddress = deployerWallet.address;
  console.log('Deployer: ', deployerWalletAddress);

  const NECTUsdToNECTiBgtEthersFactory = await ethers.getContractFactory("NECTUsdToNECTiBgt", deployerWallet)
  const nectUsdToNECTiBgt = await NECTUsdToNECTiBgtEthersFactory.deploy()
  console.log(`NECTUsdToNECTiBgt address: ${nectUsdToNECTiBgt.address}`)
  console.log(`NECTUsdToNECTiBgt price:   ${await nectUsdToNECTiBgt.latestAnswer()}`)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
