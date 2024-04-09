const externalAddrs  = {
  // https://data.chain.link/ibgt-usd
  CHAINLINK_iBGTUSD_PROXY: "0x3DaD300A888CE2c31925079c1EBEb54feEE847B9", // berachain 0x8b327b4B93B7aAA184aA2F90Fba34185F80C3429
  // https://docs.tellor.io/tellor/integration/reference-page
  TELLOR_MASTER:"0xFE8ce62ef63a1e23F871830068614F93545fCBfA", // berachain 0x93225f2574789EcE78a9fEE68D64F394aDccE3E5
  // https://uniswap.org/docs/v2/smart-contracts/factory/
  UNISWAP_V2_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // berachain 0xEe8d287B844959ADe40d718Dc23077ba920e2f07 // ethereum 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
  UNISWAP_V2_ROUTER02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // berachain 0x26841a0A5D958B128209F4ea9a1DD7E61558c330 // ethereum 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
  // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
  iBGT_ERC20: "0x3B22f0466d98bE3040d2c51dE89b0479FDD48910", // berachain WBERA 0x5e1100ea18F918a4e9AB70694c6c554e1E940D32 // ethereum 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
}

const beraborrowAddrs = {
  PUBLIC_SAFE:"0x42d0b8efF2fFF1a70B57C8E96bE77C2e49A774c3", // to be passed to POLLENToken as the public sale address
  SEED_SAFE:"0xb61cF5D1E4CA1E15DDd4E1f3137B34Bdf2Afe957", // to be passed to POLLENToken as the seed sale address
  STRATEGIC_SAFE:"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // to be passed to POLLENToken as the strategic address
  TEAM_SAFE:"0x31c57298578f7508B5982062cfEc5ec8BD346247", // to be passed to POLLENToken as the team address
  BAB_SAFE:"0x566454eF325a5eA22a831eBb4fF236F74E1372CD", // to be passed to POLLENToken as the BaB address
  POLLEN_SAFE:"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // to be passed to POLLENToken as the POLLEN multisig address
  DEPLOYER: "0x31c57298578f7508B5982062cfEc5ec8BD346247" // berachain REAL deployment address 0x552594b83058882C2263DBe23235477f63e7D60B
}

// Beneficiaries for lockup contracts. 
const beneficiaries = {
  ACCOUNT_1: "0x566454eF325a5eA22a831eBb4fF236F74E1372CD",  
  ACCOUNT_2: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
}

const OUTPUT_FILE = './berachainDeployment/berachainDeploymentOutput.json'

const delay = ms => new Promise(res => setTimeout(res, ms));
const waitFunction = async () => {
  return delay(90000) // wait 90s
}

const GAS_PRICE = 20000000000
const TX_CONFIRMATIONS = 3 // for berachain

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