const externalAddrs  = {
  // https://data.chain.link/ibgt-usd
  CHAINLINK_iBGTUSD_PROXY: "0x8b327b4B93B7aAA184aA2F90Fba34185F80C3429", 
  // https://docs.tellor.io/tellor/integration/reference-page
  TELLOR_MASTER:"0x93225f2574789EcE78a9fEE68D64F394aDccE3E5",
  // https://uniswap.org/docs/v2/smart-contracts/factory/
  UNISWAP_V2_FACTORY: "0xEe8d287B844959ADe40d718Dc23077ba920e2f07", // berachain 0xEe8d287B844959ADe40d718Dc23077ba920e2f07 // ethereum 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
  UNISWAP_V2_ROUTER02: "0x26841a0A5D958B128209F4ea9a1DD7E61558c330", // berachain 0x26841a0A5D958B128209F4ea9a1DD7E61558c330 // ethereum 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
  // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
  iBGT_ERC20: "0x61ac8568e1309342F4614b1D664E341A4E10C5b8", // berachain WBERA 0x5e1100ea18F918a4e9AB70694c6c554e1E940D32
}

const beraborrowAddrs = {
  GENERAL_SAFE:"0x566454eF325a5eA22a831eBb4fF236F74E1372CD", // to be passed to POLLENToken as the bounties/hackathons address
  POLLEN_SAFE:"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // to be passed to POLLENToken as the POLLEN multisig address
  DEPLOYER: "0x552594b83058882C2263DBe23235477f63e7D60B" // Mainnet REAL deployment address 0x552594b83058882C2263DBe23235477f63e7D60B
}

// Beneficiaries for lockup contracts. 
const beneficiaries = {
  ACCOUNT_1: "0x566454eF325a5eA22a831eBb4fF236F74E1372CD",  
  ACCOUNT_2: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
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