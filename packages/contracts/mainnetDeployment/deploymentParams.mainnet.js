const externalAddrs  = {
  // https://data.chain.link/ibgt-usd
  CHAINLINK_iBGTUSD_PROXY: "0x3DaD300A888CE2c31925079c1EBEb54feEE847B9", 
  // https://docs.tellor.io/tellor/integration/reference-page
  TELLOR_MASTER:"0xFE8ce62ef63a1e23F871830068614F93545fCBfA",
  // https://uniswap.org/docs/v2/smart-contracts/factory/
  UNISWAP_V2_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // berachain 0xEe8d287B844959ADe40d718Dc23077ba920e2f07
  UNISWAP_V2_ROUTER02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // berachain 0x26841a0A5D958B128209F4ea9a1DD7E61558c330
  // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
  iBGT_ERC20: "0x3B22f0466d98bE3040d2c51dE89b0479FDD48910", // berachain WBERA 0x5e1100ea18F918a4e9AB70694c6c554e1E940D32
}

const beraborrowAddrs = {
  GENERAL_SAFE:"0xF06016D822943C42e3Cb7FC3a6A3B1889C1045f8", // to be passed to POLLENToken as the bounties/hackathons address
  POLLEN_SAFE:"0xb8a9faDA75c6d891fB77a7988Ff9BaD9e485Ca1C", // to be passed to POLLENToken as the POLLEN multisig address
  DEPLOYER: "0x31c57298578f7508B5982062cfEc5ec8BD346247" // Mainnet REAL deployment address 0x552594b83058882C2263DBe23235477f63e7D60B
}

// Beneficiaries for lockup contracts. 
const beneficiaries = {
  ACCOUNT_1: "0xBBdc88676759D09617C288E29f2Eb7Ce94592f25",  
  ACCOUNT_2: "0x77616b3a57C9ACf018E87c92ae187C8Cc0B112D6",
}

const OUTPUT_FILE = './mainnetDeployment/mainnetDeploymentOutput.json'

const delay = ms => new Promise(res => setTimeout(res, ms));
const waitFunction = async () => {
  return delay(90000) // wait 90s
}

const GAS_PRICE = 20000000000
const TX_CONFIRMATIONS = 3 // for mainnet

const BERASCAN_BASE_URL = 'https://artio.beratrail.io//address'

module.exports = {
  externalAddrs,
  beraborrowAddrs,
  beneficiaries,
  OUTPUT_FILE,
  waitFunction,
  GAS_PRICE,
  TX_CONFIRMATIONS,
  BERASCAN_BASE_URL,
};