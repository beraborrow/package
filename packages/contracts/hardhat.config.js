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

module.exports = {
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
            {
                version: "0.8.0",
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
            gasPrice: 1000000000000,
            timeout: 100000000
        },
        hardhat: {
            accounts: accountsList,
            blockGasLimit: 1500000000,
            gas: 210000000,
            gasPrice: 11000000000000,
            initialBaseFeePerGas: 0,
            // forking: {
            //     url: `https://ethereum-rpc.publicnode.com`,
            //     enabled: true,
            //     chainId: 1
            // }
        },
        bera: {
            url: "https://artio.rpc.berachain.com/", // https://rpc.ankr.com/berachain_testnet
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
            sepolia: "FAQHXR8Q49UY22ZRVPCNQFTMI5IBV8Z5XT",
            goerli: "FAQHXR8Q49UY22ZRVPCNQFTMI5IBV8Z5XT"
        },
        customChains: [
            {
                network: "sepolia",
                chainId: 11155111,
                urls: {
                    apiURL: "https://api-sepolia.etherscan.io/api",
                    browserURL: "https://sepolia.etherscan.io/"
                }
            },
            {
                network: "bera",
                chainId: 80085,
                urls: {
                    apiURL: "https://api.routescan.io/v2/network/testnet/evm/80085/etherscan",
                    browserURL: "https://artio.beratrail.io/"
                }
            },
            {
                network: "goerli",
                chainId: 5,
                urls: {
                    apiURL: "https://api-goerli.etherscan.io/api",
                    browserURL: "https://goerli.etherscan.io/"
                }
            }
        ]
    },
};
