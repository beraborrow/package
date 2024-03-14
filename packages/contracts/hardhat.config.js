require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");
require("hardhat-gas-reporter");

const ENV = require ("./env.json")
const accounts = require("./hardhatAccountsList2k.js");
const accountsList = accounts.accountsList

const fs = require('fs')
const getSecret = (secretKey, defaultValue='') => {
    const SECRETS_FILE = "./secrets.js"
    let secret = defaultValue
    if (fs.existsSync(SECRETS_FILE)) {
        const { secrets } = require(SECRETS_FILE)
        if (secrets[secretKey]) { secret = secrets[secretKey] }
    }

    return secret
}
const alchemyUrl = () => {
    return `https://eth-mainnet.alchemyapi.io/v2/${getSecret('alchemyAPIKey')}`
}

const alchemyUrlRinkeby = () => {
    return `https://eth-rinkeby.alchemyapi.io/v2/${getSecret('alchemyAPIKeyRinkeby')}`
}

module.exports = {
    paths: {
        // contracts: "./contracts",
        // artifacts: "./artifacts"
    },
    solidity: {
        compilers: [
            {
                version: "0.4.23",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100
                    }
                }
            },
            {
                version: "0.5.17",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100
                    }
                }
            },
            {
                version: "0.6.11",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100
                    }
                }
            },
        ]
    },
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545/",
            chainId: 31337,
            gasPrice: 600000000000,
        },
        hardhat: {
            accounts: accountsList,
            gas: 1000000000,  // tx gas limit
            blockGasLimit: 1500000000,
            gas: 210000000,
            gasPrice: 11000000000000,
            initialBaseFeePerGas: 0,
        },
        mainnet: {
            url: alchemyUrl(),
            gasPrice: process.env.GAS_PRICE ? parseInt(process.env.GAS_PRICE) : 20000000000,
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', ''),
                getSecret('ACCOUNT2_PRIVATEKEY', '')
            ]
        },
        sepolia: {
            url: "https://ethereum-sepolia-rpc.publicnode.com",
            gasPrice: process.env.GAS_PRICE ? parseInt(process.env.GAS_PRICE) : 30000000000,
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', ENV.DEPLOY_PRIVATE_KEY1),
                getSecret('ACCOUNT2_PRIVATEKEY', ENV.DEPLOY_PRIVATE_KEY2)
            ],
            chainId: 11155111
        }
    },
    etherscan: {
        apiKey: {
            sepolia: "FAQHXR8Q49UY22ZRVPCNQFTMI5IBV8Z5XT"
        },
        customChains: [
            {
                network: "sepolia",
                chainId: 11155111,
                urls: {
                    apiURL: "https://api-sepolia.etherscan.io/api",
                    browserURL: "https://sepolia.etherscan.io/"
                }
            }
        ]
    },
};
