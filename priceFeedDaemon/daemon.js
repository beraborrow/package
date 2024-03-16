const { newContract, newWeb3, queryContract, executeContract, getGasEstimation } = require('./web3')
const chainConfig = require("./config")
const fs = require('fs')
const axios  = require('axios')

const apiUrl = 'https://www.mexc.com/open/api/v2/market/ticker?symbol=ETH_USDT';
// const apiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=sei-network&vs_currencies=usd'

async function sleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
    const pvkey = fs.readFileSync('.env').toString().trim()
    const ibgtOracleABI = JSON.parse(fs.readFileSync('./ibgtOracle.json').toString())
    const nectOracleABI = JSON.parse(fs.readFileSync('./nectOracle.json').toString())

    const coreContext = await newWeb3('berachain', pvkey)
    const ibgtOracleContract = await newContract(coreContext, ibgtOracleABI.abi, chainConfig['berachain'].iBGT_ORACLE_ADDRESS)

    while(true) {
        const response = await axios.get(apiUrl)
        if (response.status === 200) {
            const data = response.data.data
            if (data.length > 0 && data[0]['last'] !== undefined) {
                try {
                    console.log ("waiting set price ===> ", data[0]['last'])
                    await executeContract(coreContext, ibgtOracleContract._address, ibgtOracleContract.methods.setPrice(Math.floor(data[0]['last'] * 100000000)))
                    console.log ("successfully set price ===> ", data[0]['last'])
                } catch (e) {
                    console.log (e)
                }
            }
            console.log (data[0].last)

            // const data = response.data
            // if (data['sei-network'] && data['sei-network']['usd']) {
            //     console.log (data['sei-network']['usd'])
            // }

        }
        await sleep(10000)
    }

    
}

main()
    .then(() => { })
    .catch(err => {
        console.log(err)
        process.exit();
    })