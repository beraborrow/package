// Test with:
// GAS_PRICE=70832172907 BLOCK_NUMBER=15122486 npx hardhat run mainnetDeployment/aaveiBgtOracleDeployment.js --config hardhat.config.mainnet-fork.js

// Deploy on mainnet with:
// GAS_PRICE=40000000000 npx hardhat run mainnetDeployment/aaveiBgtOracleDeployment.js --network mainnet
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

  const NECTUsdToNECTiBgtiBgtsFactory = await ethers.getContractFactory("NECTUsdToNECTiBgt", deployerWallet)
  const nectUsdToNECTiBgt = await NECTUsdToNECTiBgtiBgtsFactory.deploy()
  console.log(`NECTUsdToNECTiBgt address: ${nectUsdToNECTiBgt.address}`)
  console.log(`NECTUsdToNECTiBgt price:   ${await nectUsdToNECTiBgt.latestAnswer()}`)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
